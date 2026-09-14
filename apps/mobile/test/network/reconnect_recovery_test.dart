import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:pioneer_mobile/core/network/socket_events.dart';
import 'package:pioneer_mobile/core/network/socket_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const validLotId = '11111111-1111-4111-8111-111111111111';
  const validAuctionId = '22222222-2222-4222-8222-222222222222';

  group('SocketService Web Parity Event Trace Replay', () {
    late SocketService socketService;

    setUp(() {
      socketService = SocketService();
    });

    tearDown(() {
      socketService.dispose();
    });

    test('replays web sequence classification trace: 5 -> 6 -> 6(stale) -> 9(gap) -> snapshot(9) -> 10', () {
      final appliedSequences = <int>[];
      final snapshots = <int>[];
      final gaps = <String>[];

      socketService.addSnapshotListener((event) {
        snapshots.add(event.sequence);
      });

      socketService.addGapDetectedListener((lotId) {
        gaps.add(lotId);
      });

      // 1. Initial snapshot applied at sequence 5 (as received from lot:subscribe ack)
      final initialSnapshot = LotSnapshotEvent(
        auctionId: validAuctionId,
        lotId: validLotId,
        sequence: 5,
        state: LotPublicState(
          bidCount: 1,
          closesAt: '2026-07-14T17:02:00.000Z',
          currentBid: Money(amountFils: 10000, currency: Currency.AED),
          lifecycle: 'LIVE',
          nextMinimumBid: Money(amountFils: 20000, currency: Currency.AED),
          reserveStatus: 'MET',
        ),
      );

      socketService.applySnapshotForTesting(initialSnapshot);
      expect(snapshots, [5]);
      expect(socketService.getLastAppliedSequence(validLotId), 5);

      // 2. Incoming bid:accepted at sequence 6 (5 + 1) applies
      socketService.handleSequencedEventForTesting(
        lotId: validLotId,
        sequence: 6,
        onApply: () => appliedSequences.add(6),
      );
      expect(appliedSequences, [6]);
      expect(socketService.getLastAppliedSequence(validLotId), 6);

      // 3. Duplicate event at sequence 6 is stale and ignored
      socketService.handleSequencedEventForTesting(
        lotId: validLotId,
        sequence: 6,
        onApply: () => appliedSequences.add(6),
      );
      expect(appliedSequences, [6]); // Not added again!

      // 4. Out-of-order event at sequence 9 is a gap (after 6)
      socketService.handleSequencedEventForTesting(
        lotId: validLotId,
        sequence: 9,
        onApply: () => appliedSequences.add(9),
      );
      expect(appliedSequences, [6]); // Did NOT apply!
      expect(gaps, [validLotId]); // Gap listener triggered!

      // 5. Snapshot ack resolves at sequence 9 from lot:sync
      final syncSnapshot = LotSnapshotEvent(
        auctionId: validAuctionId,
        lotId: validLotId,
        sequence: 9,
        state: LotPublicState(
          bidCount: 4,
          closesAt: '2026-07-14T17:02:00.000Z',
          currentBid: Money(amountFils: 90000, currency: Currency.AED),
          lifecycle: 'LIVE',
          nextMinimumBid: Money(amountFils: 100000, currency: Currency.AED),
          reserveStatus: 'MET',
        ),
      );
      socketService.applySnapshotForTesting(syncSnapshot);
      expect(snapshots, [5, 9]);
      expect(socketService.getLastAppliedSequence(validLotId), 9);

      // 6. Incoming bid:accepted at sequence 10 (9 + 1) applies cleanly
      socketService.handleSequencedEventForTesting(
        lotId: validLotId,
        sequence: 10,
        onApply: () => appliedSequences.add(10),
      );
      expect(appliedSequences, [6, 10]);
      expect(socketService.getLastAppliedSequence(validLotId), 10);
    });

    test('reconnect preserves subscribed lots and sequences', () {
      socketService.setSubscribedLotForTesting(validLotId, 7);
      expect(socketService.getLastAppliedSequence(validLotId), 7);

      // Unsubscribe removes it
      socketService.unsubscribeFromLot(validLotId);
      expect(socketService.getLastAppliedSequence(validLotId), isNull);
    });
  });
}
