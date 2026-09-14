import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'api_config.dart';

typedef BidPlacedCallback = void Function(Map<String, dynamic> data);
typedef GoingOnceCallback = void Function(Map<String, dynamic> data);
typedef StatusChangedCallback = void Function(Map<String, dynamic> data);

class SocketService {
  socket_io.Socket? _socket;
  bool _isConnected = false;
  bool get isConnected => _isConnected;

  final List<VoidCallback> _connectionListeners = [];
  final List<BidPlacedCallback> _bidPlacedListeners = [];
  final List<GoingOnceCallback> _goingOnceListeners = [];
  final List<StatusChangedCallback> _statusChangedListeners = [];

  void addConnectionListener(VoidCallback listener) => _connectionListeners.add(listener);
  void removeConnectionListener(VoidCallback listener) => _connectionListeners.remove(listener);

  void addBidPlacedListener(BidPlacedCallback listener) => _bidPlacedListeners.add(listener);
  void removeBidPlacedListener(BidPlacedCallback listener) => _bidPlacedListeners.remove(listener);

  void addGoingOnceListener(GoingOnceCallback listener) => _goingOnceListeners.add(listener);
  void removeGoingOnceListener(GoingOnceCallback listener) => _goingOnceListeners.remove(listener);

  void addStatusChangedListener(StatusChangedCallback listener) => _statusChangedListeners.add(listener);
  void removeStatusChangedListener(StatusChangedCallback listener) => _statusChangedListeners.remove(listener);

  /// Connects to the Socket.IO bidding gateway at /auctions/v1.
  void connect({String? testAccountId}) {
    if (_socket != null && _isConnected) return;

    try {
      final endpoint = '${ApiConfig.socketUrl}${ApiConfig.socketNamespace}';
      _socket = socket_io.io(
        endpoint,
        socket_io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setAuth({'testAccountId': testAccountId ?? ApiConfig.defaultTestAccountId})
            .setExtraHeaders(ApiConfig.defaultHeaders(testAccountId: testAccountId))
            .build(),
      );

      _socket?.onConnect((_) {
        _isConnected = true;
        for (final listener in _connectionListeners) {
          listener();
        }
      });

      _socket?.onDisconnect((_) {
        _isConnected = false;
        for (final listener in _connectionListeners) {
          listener();
        }
      });

      _socket?.onConnectError((_) {
        _isConnected = false;
        for (final listener in _connectionListeners) {
          listener();
        }
      });

      // Bidding Events
      _socket?.on('lot:bid-placed', (data) {
        if (data is Map<String, dynamic>) {
          for (final listener in _bidPlacedListeners) {
            listener(data);
          }
        }
      });

      _socket?.on('lot:going-once', (data) {
        if (data is Map<String, dynamic>) {
          for (final listener in _goingOnceListeners) {
            listener(data);
          }
        }
      });

      _socket?.on('bid:status-changed', (data) {
        if (data is Map<String, dynamic>) {
          for (final listener in _statusChangedListeners) {
            listener(data);
          }
        }
      });

      _socket?.connect();
    } catch (e) {
      debugPrint('Socket connection failed: $e');
      _isConnected = false;
    }
  }

  /// Subscribes to a specific lot's room.
  void subscribeToLot(String lotId, {int afterSequence = 0}) {
    if (_socket != null && _isConnected) {
      _socket?.emit('lot:subscribe', {
        'lotId': lotId,
        'afterSequence': afterSequence,
      });
    }
  }

  /// Unsubscribes from a lot room.
  void unsubscribeFromLot(String lotId) {
    if (_socket != null && _isConnected) {
      _socket?.emit('lot:unsubscribe', {'lotId': lotId});
    }
  }

  /// Emits a live bid command to the server via socket.
  Future<bool> placeBidViaSocket({
    required String lotId,
    required int amountAed,
    int expectedSequence = 0,
  }) async {
    if (_socket == null || !_isConnected) return false;

    final completer = Completer<bool>();
    final payload = {
      'commandId': 'cmd-${DateTime.now().millisecondsSinceEpoch}',
      'correlationId': 'cor-${DateTime.now().millisecondsSinceEpoch}',
      'contractVersion': ApiConfig.contractVersion,
      'lotId': lotId,
      'amount': {
        'amountFils': amountAed * 100,
        'currency': 'AED',
      },
      'expectedSequence': expectedSequence,
      'sentAt': DateTime.now().toUtc().toIso8601String(),
      'termsVersionId': 'terms-v1',
    };

    _socket?.emitWithAck('bid:place', payload, ack: (data) {
      if (data is Map && data['status'] == 'ACCEPTED') {
        completer.complete(true);
      } else {
        completer.complete(false);
      }
    });

    return completer.future.timeout(const Duration(seconds: 4), onTimeout: () => false);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
