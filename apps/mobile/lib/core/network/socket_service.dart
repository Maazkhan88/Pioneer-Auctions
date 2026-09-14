import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import '../utils/uuid_service.dart';
import 'api_config.dart';
import 'socket_events.dart';

sealed class SocketCommandOutcome<T> {
  const SocketCommandOutcome();
}

class SocketCommandSuccess<T> extends SocketCommandOutcome<T> {
  final T data;
  final String? correlationId;
  const SocketCommandSuccess(this.data, {this.correlationId});
}

class SocketCommandFailure<T> extends SocketCommandOutcome<T> {
  final String code;
  final String message;
  final bool retryable;
  final Map<String, dynamic>? latest;
  const SocketCommandFailure({
    required this.code,
    required this.message,
    this.retryable = false,
    this.latest,
  });
}

class SocketCommandNotConnected<T> extends SocketCommandOutcome<T> {
  const SocketCommandNotConnected();
}

class SocketCommandUnknown<T> extends SocketCommandOutcome<T> {
  final String commandId;
  final String message;
  const SocketCommandUnknown({required this.commandId, required this.message});
}

/// Realtime bidding gateway client over Socket.IO (/auctions/v1).
/// Matches docs/api-contracts.md §6-§10 and §14 (reconnect algorithm).
class SocketService with WidgetsBindingObserver {
  socket_io.Socket? _socket;
  bool _isConnected = false;
  bool get isConnected => _isConnected;

  String? _testAccountId;
  Duration _serverClockOffset = Duration.zero;
  Duration get serverClockOffset => _serverClockOffset;

  DateTime get estimatedServerTime => DateTime.now().toUtc().add(_serverClockOffset);

  /// lotId -> lastAppliedSequence (null if awaiting snapshot)
  final Map<String, int?> _subscribedLots = {};

  // Handlers / Listeners
  final List<void Function(bool isConnected)> _connectionListeners = [];
  final List<void Function(ServerHelloEvent event)> _helloListeners = [];
  final List<void Function(LotSnapshotEvent event)> _snapshotListeners = [];
  final List<void Function(BidAcceptedEvent event)> _bidAcceptedListeners = [];
  final List<void Function(AuctionExtendedEvent event)> _auctionExtendedListeners = [];
  final List<void Function(AuctionStateChangedEvent event)> _auctionStateChangedListeners = [];
  final List<void Function(ReserveStatusChangedEvent event)> _reserveStatusChangedListeners = [];
  final List<void Function(LotPresenceChangedEvent event)> _presenceListeners = [];
  final List<void Function(MyBidStatusChangedEvent event)> _myBidStatusChangedListeners = [];
  final List<void Function(ProxyBidChangedEvent event)> _proxyBidChangedListeners = [];
  final List<void Function(String lotId)> _gapDetectedListeners = [];

  SocketService() {
    WidgetsBinding.instance.addObserver(this);
  }

  void addConnectionListener(void Function(bool isConnected) l) => _connectionListeners.add(l);
  void removeConnectionListener(void Function(bool isConnected) l) => _connectionListeners.remove(l);

  void addHelloListener(void Function(ServerHelloEvent) l) => _helloListeners.add(l);
  void removeHelloListener(void Function(ServerHelloEvent) l) => _helloListeners.remove(l);

  void addSnapshotListener(void Function(LotSnapshotEvent) l) => _snapshotListeners.add(l);
  void removeSnapshotListener(void Function(LotSnapshotEvent) l) => _snapshotListeners.remove(l);

  void addBidAcceptedListener(void Function(BidAcceptedEvent) l) => _bidAcceptedListeners.add(l);
  void removeBidAcceptedListener(void Function(BidAcceptedEvent) l) => _bidAcceptedListeners.remove(l);

  void addAuctionExtendedListener(void Function(AuctionExtendedEvent) l) => _auctionExtendedListeners.add(l);
  void removeAuctionExtendedListener(void Function(AuctionExtendedEvent) l) => _auctionExtendedListeners.remove(l);

  void addAuctionStateChangedListener(void Function(AuctionStateChangedEvent) l) => _auctionStateChangedListeners.add(l);
  void removeAuctionStateChangedListener(void Function(AuctionStateChangedEvent) l) => _auctionStateChangedListeners.remove(l);

  void addReserveStatusChangedListener(void Function(ReserveStatusChangedEvent) l) => _reserveStatusChangedListeners.add(l);
  void removeReserveStatusChangedListener(void Function(ReserveStatusChangedEvent) l) => _reserveStatusChangedListeners.remove(l);

  void addPresenceListener(void Function(LotPresenceChangedEvent) l) => _presenceListeners.add(l);
  void removePresenceListener(void Function(LotPresenceChangedEvent) l) => _presenceListeners.remove(l);

  void addMyBidStatusChangedListener(void Function(MyBidStatusChangedEvent) l) => _myBidStatusChangedListeners.add(l);
  void removeMyBidStatusChangedListener(void Function(MyBidStatusChangedEvent) l) => _myBidStatusChangedListeners.remove(l);

  void addProxyBidChangedListener(void Function(ProxyBidChangedEvent) l) => _proxyBidChangedListeners.add(l);
  void removeProxyBidChangedListener(void Function(ProxyBidChangedEvent) l) => _proxyBidChangedListeners.remove(l);

  void addGapDetectedListener(void Function(String lotId) l) => _gapDetectedListeners.add(l);
  void removeGapDetectedListener(void Function(String lotId) l) => _gapDetectedListeners.remove(l);

  int? getLastAppliedSequence(String lotId) => _subscribedLots[lotId];

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Foreground recovery: Trigger sync for all currently subscribed lots
      resyncAllLots();
    }
  }

  /// Connects to the Socket.IO bidding gateway at /auctions/v1.
  void connect({String? testAccountId}) {
    if (_socket != null && _isConnected) return;
    _testAccountId = testAccountId ?? ApiConfig.defaultTestAccountId;

    try {
      final endpoint = '${ApiConfig.socketUrl}${ApiConfig.socketNamespace}';
      _socket = socket_io.io(
        endpoint,
        socket_io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .setAuth({'testAccountId': _testAccountId})
            .setExtraHeaders(ApiConfig.defaultHeaders(testAccountId: _testAccountId))
            .build(),
      );

      _socket?.onConnect((_) {
        _isConnected = true;
        _notifyConnection(true);
        // Automatically re-subscribe to all subscribed lots on connect/reconnect
        _resubscribeAll();
      });

      _socket?.onDisconnect((_) {
        _isConnected = false;
        _notifyConnection(false);
      });

      _socket?.onConnectError((_) {
        _isConnected = false;
        _notifyConnection(false);
      });

      // Handshake
      _socket?.on('server:hello', (data) {
        final event = ServerHelloEvent.fromJson(data);
        if (event != null) {
          _updateClockOffset(event.serverTime);
          for (final l in _helloListeners) {
            l(event);
          }
        }
      });

      // Lot snapshot
      _socket?.on('lot:snapshot', (data) {
        final event = LotSnapshotEvent.fromJson(data);
        if (event != null) {
          _applySnapshot(event);
        }
      });

      // Sequenced public events
      _socket?.on('bid:accepted', (data) {
        final event = BidAcceptedEvent.fromJson(data);
        if (event != null) {
          _handleSequencedEvent(
            lotId: event.lotId,
            sequence: event.sequence,
            onApply: () {
              for (final l in _bidAcceptedListeners) {
                l(event);
              }
            },
          );
        }
      });

      _socket?.on('auction:extended', (data) {
        final event = AuctionExtendedEvent.fromJson(data);
        if (event != null) {
          _handleSequencedEvent(
            lotId: event.lotId,
            sequence: event.sequence,
            onApply: () {
              for (final l in _auctionExtendedListeners) {
                l(event);
              }
            },
          );
        }
      });

      _socket?.on('auction:state-changed', (data) {
        final event = AuctionStateChangedEvent.fromJson(data);
        if (event != null) {
          _handleSequencedEvent(
            lotId: event.lotId,
            sequence: event.sequence,
            onApply: () {
              for (final l in _auctionStateChangedListeners) {
                l(event);
              }
            },
          );
        }
      });

      _socket?.on('reserve:status-changed', (data) {
        final event = ReserveStatusChangedEvent.fromJson(data);
        if (event != null) {
          _handleSequencedEvent(
            lotId: event.lotId,
            sequence: event.sequence,
            onApply: () {
              for (final l in _reserveStatusChangedListeners) {
                l(event);
              }
            },
          );
        }
      });

      _socket?.on('lot:presence-changed', (data) {
        final event = LotPresenceChangedEvent.fromJson(data);
        if (event != null) {
          for (final l in _presenceListeners) {
            l(event);
          }
        }
      });

      // Personal enveloped events
      _socket?.on('bid:status-changed', (data) {
        final event = MyBidStatusChangedEvent.fromEnveloped(data);
        if (event != null) {
          for (final l in _myBidStatusChangedListeners) {
            l(event);
          }
        }
      });

      _socket?.on('proxy-bid:changed', (data) {
        final event = ProxyBidChangedEvent.fromEnveloped(data);
        if (event != null) {
          for (final l in _proxyBidChangedListeners) {
            l(event);
          }
        }
      });

      _socket?.connect();
    } catch (e) {
      debugPrint('Socket connection failed: $e');
      _isConnected = false;
      _notifyConnection(false);
    }
  }

  @visibleForTesting
  void applySnapshotForTesting(LotSnapshotEvent snapshot) => _applySnapshot(snapshot);

  @visibleForTesting
  void handleSequencedEventForTesting({
    required String lotId,
    required int sequence,
    required VoidCallback onApply,
  }) => _handleSequencedEvent(lotId: lotId, sequence: sequence, onApply: onApply);

  @visibleForTesting
  void setSubscribedLotForTesting(String lotId, int? sequence) {
    _subscribedLots[lotId] = sequence;
  }

  void _notifyConnection(bool connected) {
    for (final l in _connectionListeners) {
      l(connected);
    }
  }

  void _updateClockOffset(DateTime serverTime) {
    _serverClockOffset = serverTime.toUtc().difference(DateTime.now().toUtc());
  }

  /// Subscribes to a lot room. Automatically resubscribes on reconnect.
  void subscribeToLot(String lotId) {
    if (!_subscribedLots.containsKey(lotId)) {
      _subscribedLots[lotId] = null;
    }
    _sendSubscribe(lotId);
  }

  /// Unsubscribes from a lot room.
  void unsubscribeFromLot(String lotId) {
    _subscribedLots.remove(lotId);
    if (_socket != null && _isConnected) {
      final payload = {
        'commandId': UuidService.generate(),
        'contractVersion': ApiConfig.contractVersion,
        'lotId': lotId,
        'sentAt': DateTime.now().toUtc().toIso8601String(),
      };
      _socket?.emit('lot:unsubscribe', payload);
    }
  }

  void _resubscribeAll() {
    for (final lotId in _subscribedLots.keys.toList()) {
      _sendSubscribe(lotId);
    }
  }

  void _sendSubscribe(String lotId) {
    if (_socket == null || !_isConnected) return;

    final lastSeq = _subscribedLots[lotId];
    final payload = <String, dynamic>{
      'commandId': UuidService.generate(),
      'contractVersion': ApiConfig.contractVersion,
      'lotId': lotId,
      'sentAt': DateTime.now().toUtc().toIso8601String(),
    };
    if (lastSeq != null) {
      payload['afterSequence'] = lastSeq;
    }

    _socket?.emitWithAck('lot:subscribe', payload, ack: (ack) {
      _processSnapshotAck(ack);
    });
  }

  /// Emits `lot:sync` for a specific lot.
  void syncLot(String lotId) {
    if (_socket == null || !_isConnected) return;
    final lastSeq = _subscribedLots[lotId];
    final payload = <String, dynamic>{
      'commandId': UuidService.generate(),
      'contractVersion': ApiConfig.contractVersion,
      'lotId': lotId,
      'sentAt': DateTime.now().toUtc().toIso8601String(),
    };
    if (lastSeq != null) {
      payload['afterSequence'] = lastSeq;
    }

    _socket?.emitWithAck('lot:sync', payload, ack: (ack) {
      _processSnapshotAck(ack);
    });
  }

  /// Syncs all currently subscribed lots (e.g. on foreground resume).
  void resyncAllLots() {
    for (final lotId in _subscribedLots.keys) {
      syncLot(lotId);
    }
  }

  void _processSnapshotAck(dynamic ack) {
    if (ack is! Map<String, dynamic>) return;
    if (ack['serverTime'] != null) {
      try {
        _updateClockOffset(DateTime.parse(ack['serverTime'].toString()));
      } catch (_) {}
    }

    if (ack['status'] == 'ACCEPTED' && ack['result'] is Map<String, dynamic>) {
      final snapshot = LotSnapshotEvent.fromJson(ack['result']);
      if (snapshot != null) {
        _applySnapshot(snapshot);
      }
    }
  }

  void _applySnapshot(LotSnapshotEvent snapshot) {
    _subscribedLots[snapshot.lotId] = snapshot.sequence;
    for (final l in _snapshotListeners) {
      l(snapshot);
    }
  }

  void _handleSequencedEvent({
    required String lotId,
    required int sequence,
    required VoidCallback onApply,
  }) {
    final lastApplied = _subscribedLots[lotId];
    final decision = classifySequence(lastApplied, sequence);

    switch (decision) {
      case SequenceDecision.stale:
        // Ignore duplicate
        return;
      case SequenceDecision.gap:
        // Notify gap and trigger resync
        for (final l in _gapDetectedListeners) {
          l(lotId);
        }
        syncLot(lotId);
        return;
      case SequenceDecision.apply:
        _subscribedLots[lotId] = sequence;
        onApply();
        return;
    }
  }

  /// Submits a bid over Socket.IO (/auctions/v1).
  /// Strictly returns `SocketCommandUnknown` on timeout, preserving [commandId].
  Future<SocketCommandOutcome<CommandAck>> placeBid({
    required String lotId,
    required int amountFils,
    required String commandId,
    int expectedSequence = 0,
    String? termsVersionId,
  }) async {
    if (_socket == null || !_isConnected) {
      return const SocketCommandNotConnected();
    }

    final completer = Completer<SocketCommandOutcome<CommandAck>>();
    final timer = Timer(const Duration(seconds: 8), () {
      if (!completer.isCompleted) {
        completer.complete(SocketCommandUnknown(
          commandId: commandId,
          message: 'Timed out waiting for socket bid acknowledgement.',
        ));
      }
    });

    final payload = {
      'amount': {
        'amountFils': amountFils,
        'currency': 'AED',
      },
      'commandId': commandId,
      'contractVersion': ApiConfig.contractVersion,
      'expectedSequence': expectedSequence,
      'lotId': lotId,
      'sentAt': DateTime.now().toUtc().toIso8601String(),
      'termsVersionId': termsVersionId ?? ApiConfig.termsVersionId,
    };

    _socket?.emitWithAck('bid:place', payload, ack: (ack) {
      timer.cancel();
      if (completer.isCompleted) return;

      if (ack is! Map<String, dynamic>) {
        completer.complete(SocketCommandUnknown(
          commandId: commandId,
          message: 'Malformed acknowledgement payload received.',
        ));
        return;
      }

      if (ack['serverTime'] != null) {
        try {
          _updateClockOffset(DateTime.parse(ack['serverTime'].toString()));
        } catch (_) {}
      }

      try {
        final parsedAck = CommandAck.fromJson(ack);
        if (parsedAck.status == CommandAckStatus.ACCEPTED) {
          completer.complete(SocketCommandSuccess(parsedAck));
        } else {
          completer.complete(SocketCommandFailure(
            code: parsedAck.error?.code.name ?? 'REJECTED',
            message: parsedAck.error?.message ?? 'Bid was rejected by the server.',
            retryable: parsedAck.error?.retryable ?? false,
            latest: parsedAck.latest?.toJson(),
          ));
        }
      } catch (e) {
        completer.complete(SocketCommandUnknown(
          commandId: commandId,
          message: 'Error parsing bid acknowledgement: $e',
        ));
      }
    });

    return completer.future;
  }

  /// Raises or sets proxy bid maximum over Socket.IO.
  Future<SocketCommandOutcome<Map<String, dynamic>>> setProxyBid({
    required String lotId,
    required int maximumFils,
    required String commandId,
    int expectedSequence = 0,
    String? termsVersionId,
  }) async {
    if (_socket == null || !_isConnected) {
      return const SocketCommandNotConnected();
    }

    final completer = Completer<SocketCommandOutcome<Map<String, dynamic>>>();
    final timer = Timer(const Duration(seconds: 8), () {
      if (!completer.isCompleted) {
        completer.complete(SocketCommandUnknown(
          commandId: commandId,
          message: 'Timed out waiting for socket proxy-bid acknowledgement.',
        ));
      }
    });

    final payload = {
      'commandId': commandId,
      'contractVersion': ApiConfig.contractVersion,
      'expectedSequence': expectedSequence,
      'lotId': lotId,
      'maximum': {
        'amountFils': maximumFils,
        'currency': 'AED',
      },
      'sentAt': DateTime.now().toUtc().toIso8601String(),
      'termsVersionId': termsVersionId ?? ApiConfig.termsVersionId,
    };

    _socket?.emitWithAck('proxy-bid:set', payload, ack: (ack) {
      timer.cancel();
      if (completer.isCompleted) return;

      if (ack is! Map<String, dynamic>) {
        completer.complete(SocketCommandUnknown(
          commandId: commandId,
          message: 'Malformed proxy acknowledgement payload.',
        ));
        return;
      }

      if (ack['serverTime'] != null) {
        try {
          _updateClockOffset(DateTime.parse(ack['serverTime'].toString()));
        } catch (_) {}
      }

      if (ack['status'] == 'ACCEPTED') {
        completer.complete(SocketCommandSuccess(ack));
      } else {
        final error = ack['error'] as Map<String, dynamic>?;
        completer.complete(SocketCommandFailure(
          code: error?['code']?.toString() ?? 'PROXY_REJECTED',
          message: error?['message']?.toString() ?? 'Proxy bid rejected.',
          retryable: error?['retryable'] as bool? ?? false,
          latest: ack['latest'] as Map<String, dynamic>?,
        ));
      }
    });

    return completer.future;
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _notifyConnection(false);
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    disconnect();
    _connectionListeners.clear();
    _helloListeners.clear();
    _snapshotListeners.clear();
    _bidAcceptedListeners.clear();
    _auctionExtendedListeners.clear();
    _auctionStateChangedListeners.clear();
    _reserveStatusChangedListeners.clear();
    _presenceListeners.clear();
    _myBidStatusChangedListeners.clear();
    _proxyBidChangedListeners.clear();
    _gapDetectedListeners.clear();
  }
}
