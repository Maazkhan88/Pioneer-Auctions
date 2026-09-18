import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:pioneer_mobile/core/bidding/bid_state_machine.dart';
import 'package:pioneer_mobile/core/network/socket_events.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const validLotId = '11111111-1111-4111-8111-111111111111';

  group('BidStateMachine', () {
    late BidStateMachine machine;

    setUp(() {
      machine = BidStateMachine();
    });

    test('initial state is BidIdle', () {
      expect(machine.state, isA<BidIdle>());
    });

    test('FeeBreakdown calculates 5% premium (min 500 AED) and 5% VAT preserving exact fils', () {
      // 85,000 AED = 8,500,000 fils
      // 5% premium = 425,000 fils = 4,250.00 AED
      // 5% VAT on premium: ((425000 * 500) + 5000) ~/ 10000 = 21,250 fils = 212.50 AED
      // Total: 8500000 + 425000 + 21250 = 8,946,250 fils = 89,462.50 AED
      final breakdown = FeeBreakdown.calculate(8500000);
      expect(breakdown.hammerPriceFils, 8500000);
      expect(breakdown.buyerPremiumFils, 425000);
      expect(breakdown.vatFils, 21250); // Exact 212.50 AED
      expect(breakdown.totalFils, 8946250); // Exact 89,462.50 AED

      // Low amount testing 500 AED (50,000 fils) minimum fee
      // 2,000 AED = 200,000 fils
      // 5% is 10,000 fils (100 AED), so minimum 50,000 fils (500 AED) applies
      // VAT: ((50000 * 500) + 5000) ~/ 10000 = 2500 fils = 25.00 AED
      // Total: 200000 + 50000 + 2500 = 252500 fils = 2525.00 AED
      final lowBreakdown = FeeBreakdown.calculate(200000);
      expect(lowBreakdown.hammerPriceFils, 200000);
      expect(lowBreakdown.buyerPremiumFils, 50000);
      expect(lowBreakdown.vatFils, 2500);
      expect(lowBreakdown.totalFils, 252500);
    });

    test('startConfirming without terms gate acceptance transitions to BidGated on submit', () {
      machine.startConfirming(
        amountFils: 8500000,
        expectedSequence: 41,
        termsAccepted: false,
      );

      expect(machine.state, isA<BidConfirming>());
      final confirming = machine.state as BidConfirming;
      expect(confirming.termsAccepted, isFalse);

      final cmdId = machine.startSubmitting();
      expect(cmdId, isNull);
      expect(machine.state, isA<BidGated>());
      final gated = machine.state as BidGated;
      expect(gated.reason, BidGateReason.termsAcceptanceRequired);
    });

    test('startConfirming with terms accepted transitions to BidSubmitting', () {
      machine.startConfirming(
        amountFils: 8500000,
        expectedSequence: 41,
        termsAccepted: true,
      );

      final cmdId = machine.startSubmitting();
      expect(cmdId, isNotNull);
      expect(machine.state, isA<BidSubmitting>());
      final submitting = machine.state as BidSubmitting;
      expect(submitting.commandId, cmdId);
      expect(submitting.amountFils, 8500000);
    });

    test('authoritative CommandAck ACCEPTED transitions to BidAccepted and triggers callback', () {
      bool successFired = false;
      machine.onAuthoritativeSuccess = () => successFired = true;

      machine.startConfirming(amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      // Capture the real commandId — ack validation requires it to match
      final commandId = machine.startSubmitting()!;

      final ack = CommandAck(
        commandId: commandId,
        contractVersion: 1,
        correlationId: 'corr-1',
        serverTime: DateTime.parse('2026-07-14T17:00:00.000Z'),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.parse('2026-07-14T17:05:00.000Z'),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: true,
          lotId: validLotId,
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 42,
        ),
      );

      machine.handleCommandAck(ack, amountFils: 8500000);

      expect(machine.state, isA<BidAccepted>());
      expect(successFired, isTrue);
      final accepted = machine.state as BidAccepted;
      expect(accepted.sequence, 42);
      expect(accepted.extended, isTrue);
      expect(accepted.myBidStatus, 'WINNING');
    });

    test('authoritative REJECTED transitions to BidRejected and triggers failure callback', () {
      bool failureFired = false;
      machine.onAuthoritativeFailure = () => failureFired = true;

      machine.startConfirming(amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      machine.startSubmitting();

      machine.handleFailure(
        amountFils: 8500000,
        code: 'BID_TOO_LOW',
        message: 'The current bid is higher.',
        retryable: true,
        latest: {'sequence': 43},
      );

      expect(machine.state, isA<BidRejected>());
      expect(failureFired, isTrue);
      final rejected = machine.state as BidRejected;
      expect(rejected.code, 'BID_TOO_LOW');
      expect(rejected.retryable, isTrue);
      expect(rejected.latest?['sequence'], 43);
    });

    test('gate error codes transition to BidGated', () {
      machine.startConfirming(amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      machine.startSubmitting();

      machine.handleFailure(
        amountFils: 8500000,
        code: 'DEPOSIT_REQUIRED',
        message: 'A security deposit is required to place a bid on this lot.',
      );

      expect(machine.state, isA<BidGated>());
      final gated = machine.state as BidGated;
      expect(gated.reason, BidGateReason.depositRequired);
    });

    test('timeout handles unknown and PRESERVES identical commandId upon retry', () {
      machine.startConfirming(amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      final originalCmdId = machine.startSubmitting()!;

      // Transport timeout occurs:
      machine.handleUnknown(
        amountFils: 8500000,
        commandId: originalCmdId,
        message: 'Request timed out waiting for server confirmation.',
      );

      expect(machine.state, isA<BidUnknown>());
      final unknown = machine.state as BidUnknown;
      expect(unknown.commandId, originalCmdId);

      // User retries from unknown state:
      final retryCmdId = machine.startSubmitting();
      // Invariant: Must retain the exact same commandId for idempotency!
      expect(retryCmdId, originalCmdId);
      expect(machine.state, isA<BidSubmitting>());
    });

    test('external OUTBID event transitions to BidOutbid', () {
      machine.startConfirming(amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      // Capture the real commandId — ack validation requires it to match
      final commandId = machine.startSubmitting()!;

      final ack = CommandAck(
        commandId: commandId,
        contractVersion: 1,
        correlationId: 'corr-1',
        serverTime: DateTime.parse('2026-07-14T17:00:00.000Z'),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.parse('2026-07-14T17:05:00.000Z'),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: false,
          lotId: validLotId,
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 42,
        ),
      );
      machine.handleCommandAck(ack, amountFils: 8500000);
      expect(machine.state, isA<BidAccepted>());

      // Incoming personal OUTBID event
      final outbidEvent = MyBidStatusChangedEvent(
        closesAt: '2026-07-14T17:05:00.000Z',
        currentBid: Money(amountFils: 8700000, currency: Currency.AED),
        lotId: validLotId,
        lotSequence: 43,
        nextMinimumBid: Money(amountFils: 8900000, currency: Currency.AED),
        status: 'OUTBID',
      );

      machine.handleMyBidStatusChanged(outbidEvent);
      expect(machine.state, isA<BidOutbid>());
    });

    test('ignores CommandAck without active command or with mismatched commandId', () {
      final ack = CommandAck(
        commandId: 'random-command-id',
        contractVersion: 1,
        correlationId: 'corr-1',
        serverTime: DateTime.now().toUtc(),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.now().toUtc().add(const Duration(minutes: 5)),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: false,
          lotId: validLotId,
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 42,
        ),
      );

      // Without active command: ignored
      machine.handleCommandAck(ack);
      expect(machine.state, isA<BidIdle>());

      // With mismatched commandId: ignored
      machine.startConfirming(lotId: validLotId, amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      machine.startSubmitting();
      machine.handleCommandAck(ack);
      expect(machine.state, isA<BidSubmitting>());
    });

    test('ignores CommandAck with mismatched lotId or stale sequence', () {
      machine.startConfirming(lotId: validLotId, amountFils: 8500000, expectedSequence: 50, termsAccepted: true);
      final commandId = machine.startSubmitting()!;

      // Stale sequence (40 < 50): ignored
      final staleAck = CommandAck(
        commandId: commandId,
        contractVersion: 1,
        correlationId: 'corr-stale',
        serverTime: DateTime.now().toUtc(),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.now().toUtc().add(const Duration(minutes: 5)),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: false,
          lotId: validLotId,
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 40,
        ),
      );
      machine.handleCommandAck(staleAck);
      expect(machine.state, isA<BidSubmitting>());

      // Mismatched lotId: ignored
      final wrongLotAck = CommandAck(
        commandId: commandId,
        contractVersion: 1,
        correlationId: 'corr-wrong-lot',
        serverTime: DateTime.now().toUtc(),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.now().toUtc().add(const Duration(minutes: 5)),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: false,
          lotId: 'different-lot-id',
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 51,
        ),
      );
      machine.handleCommandAck(wrongLotAck);
      expect(machine.state, isA<BidSubmitting>());
    });

    test('deduplicates completedCommandIds independently of current state', () {
      machine.startConfirming(lotId: validLotId, amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      final commandId = machine.startSubmitting()!;

      final ack = CommandAck(
        commandId: commandId,
        contractVersion: 1,
        correlationId: 'corr-dedup',
        serverTime: DateTime.now().toUtc(),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.now().toUtc().add(const Duration(minutes: 5)),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: false,
          lotId: validLotId,
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 42,
        ),
      );

      machine.handleCommandAck(ack);
      expect(machine.state, isA<BidAccepted>());
      expect(machine.completedCommandIds.contains(commandId), isTrue);

      // Transition away from BidAccepted (e.g. personal outbid event)
      final outbidEvent = MyBidStatusChangedEvent(
        closesAt: '2026-07-14T17:05:00.000Z',
        currentBid: Money(amountFils: 8700000, currency: Currency.AED),
        lotId: validLotId,
        lotSequence: 43,
        nextMinimumBid: Money(amountFils: 8900000, currency: Currency.AED),
        status: 'OUTBID',
      );
      machine.handleMyBidStatusChanged(outbidEvent);
      expect(machine.state, isA<BidOutbid>());

      // Duplicate ack arrives: MUST be ignored because commandId is in completedCommandIds!
      machine.handleCommandAck(ack);
      expect(machine.state, isA<BidOutbid>());
    });

    test('handleExternalBidAccepted updates public price only and does NOT transition to BidOutbid', () {
      machine.startConfirming(lotId: validLotId, amountFils: 8500000, expectedSequence: 41, termsAccepted: true);
      final commandId = machine.startSubmitting()!;

      final ack = CommandAck(
        commandId: commandId,
        contractVersion: 1,
        correlationId: 'corr-public',
        serverTime: DateTime.now().toUtc(),
        status: CommandAckStatus.ACCEPTED,
        result: Result(
          closesAt: DateTime.now().toUtc().add(const Duration(minutes: 5)),
          currentBid: ResultCurrentBid(amountFils: 8500000, currency: Currency.AED),
          extended: false,
          lotId: validLotId,
          myBidStatus: MyBidStatus.WINNING,
          nextMinimumBid: ResultNextMinimumBid(amountFils: 8700000, currency: Currency.AED),
          reserveStatus: ReserveStatus.MET,
          sequence: 42,
        ),
      );
      machine.handleCommandAck(ack);
      expect(machine.state, isA<BidAccepted>());

      // Incoming public bid:accepted event with higher amount from broadcast
      final publicEvent = BidAcceptedEvent(
        amount: Money(amountFils: 8700000, currency: Currency.AED),
        auctionId: 'auction-1',
        bidKind: 'MANUAL',
        currentBid: Money(amountFils: 8700000, currency: Currency.AED),
        extended: false,
        lotId: validLotId,
        nextMinimumBid: Money(amountFils: 8900000, currency: Currency.AED),
        reserveStatus: 'MET',
        sequence: 43,
      );

      machine.handleExternalBidAccepted(publicEvent);

      // Public prices are updated
      expect(machine.publicCurrentBidFils, 8700000);
      expect(machine.publicNextMinimumBidFils, 8900000);
      expect(machine.lastAppliedSequence, 43);

      // Local state is NOT outbid because public events do not determine personal status!
      expect(machine.state, isA<BidAccepted>());
      expect(machine.state, isNot(isA<BidOutbid>()));
    });
  });
}
