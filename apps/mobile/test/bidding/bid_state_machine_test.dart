import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:pioneer_mobile/core/bidding/bid_state_machine.dart';
import 'package:pioneer_mobile/core/network/socket_events.dart';

void main() {
  const validLotId = '11111111-1111-4111-8111-111111111111';

  group('BidStateMachine', () {
    late BidStateMachine machine;

    setUp(() {
      machine = BidStateMachine();
    });

    test('initial state is BidIdle', () {
      expect(machine.state, isA<BidIdle>());
    });

    test('FeeBreakdown calculates 5% premium (min 500 AED) and 5% VAT', () {
      // 85,000 AED = 8,500,000 fils
      // 5% premium = 4,250 AED = 425,000 fils
      // 5% VAT on premium = 212.5 AED = 21,250 fils
      // Total = 89,462.5 AED = 8,946,250 fils
      final breakdown = FeeBreakdown.calculate(8500000);
      expect(breakdown.hammerPriceAed, 85000.0);
      expect(breakdown.buyerPremiumAed, 4250.0);
      expect(breakdown.vatAed, 212.5);
      expect(breakdown.totalAed, 89462.5);

      // Low amount testing 500 AED minimum fee
      // 2,000 AED = 200,000 fils
      // 5% is 100 AED, so minimum 500 AED (50,000 fils) applies
      final lowBreakdown = FeeBreakdown.calculate(200000);
      expect(lowBreakdown.buyerPremiumAed, 500.0);
      expect(lowBreakdown.vatAed, 25.0);
      expect(lowBreakdown.totalAed, 2525.0);
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
      machine.startSubmitting();

      final ack = CommandAck(
        commandId: 'cmd-1',
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
      machine.startSubmitting();

      final ack = CommandAck(
        commandId: 'cmd-1',
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
  });
}
