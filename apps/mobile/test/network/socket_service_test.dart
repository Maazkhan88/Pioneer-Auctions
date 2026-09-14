import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/network/socket_service.dart';

void main() {
  group('SocketService Integration', () {
    test('initial state is disconnected', () {
      final service = SocketService();
      expect(service.isConnected, isFalse);
    });

    test('registers and unregisters listeners correctly', () {
      final service = SocketService();
      bool connectedCalled = false;
      bool bidPlacedCalled = false;
      bool goingOnceCalled = false;
      bool statusChangedCalled = false;

      void onConn() => connectedCalled = true;
      void onBid(Map<String, dynamic> data) => bidPlacedCalled = true;
      void onGoingOnce(Map<String, dynamic> data) => goingOnceCalled = true;
      void onStatus(Map<String, dynamic> data) => statusChangedCalled = true;

      service.addConnectionListener(onConn);
      service.addBidPlacedListener(onBid);
      service.addGoingOnceListener(onGoingOnce);
      service.addStatusChangedListener(onStatus);

      // Unregistering should not throw
      service.removeConnectionListener(onConn);
      service.removeBidPlacedListener(onBid);
      service.removeGoingOnceListener(onGoingOnce);
      service.removeStatusChangedListener(onStatus);

      expect(connectedCalled, isFalse);
      expect(bidPlacedCalled, isFalse);
      expect(goingOnceCalled, isFalse);
      expect(statusChangedCalled, isFalse);
    });

    test('placeBidViaSocket gracefully fails when socket is disconnected', () async {
      final service = SocketService();
      final result = await service.placeBidViaSocket(lotId: 'lot-123', amountAed: 50000);
      expect(result, isFalse);
    });
  });
}
