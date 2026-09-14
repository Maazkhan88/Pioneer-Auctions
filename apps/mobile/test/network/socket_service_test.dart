import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/network/socket_events.dart';

void main() {
  const validLotId = '11111111-1111-4111-8111-111111111111';
  const validAuctionId = '22222222-2222-4222-8222-222222222222';

  group('classifySequence (Web/Mobile Reconnect Parity)', () {
    test('treats no prior sequence as gap (awaits initial snapshot)', () {
      expect(classifySequence(null, 1), SequenceDecision.gap);
      expect(classifySequence(null, 0), SequenceDecision.gap);
    });

    test('applies exactly sequence + 1', () {
      expect(classifySequence(41, 42), SequenceDecision.apply);
      expect(classifySequence(0, 1), SequenceDecision.apply);
    });

    test('treats equal or older sequence as stale (duplicate delivery)', () {
      expect(classifySequence(42, 42), SequenceDecision.stale);
      expect(classifySequence(42, 41), SequenceDecision.stale);
      expect(classifySequence(42, 1), SequenceDecision.stale);
    });

    test('treats anything beyond sequence + 1 as gap (triggers resync)', () {
      expect(classifySequence(42, 44), SequenceDecision.gap);
      expect(classifySequence(42, 100), SequenceDecision.gap);
    });
  });

  group('Socket Events Contract Parity', () {
    test('ServerHelloEvent decodes server:hello correctly', () {
      final payload = {
        'contractVersion': 1,
        'connectionId': 'conn-xyz',
        'serverTime': '2026-07-14T17:00:00.000Z',
      };
      final event = ServerHelloEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.contractVersion, 1);
      expect(event.connectionId, 'conn-xyz');
      expect(event.serverTime.toIso8601String(), '2026-07-14T17:00:00.000Z');
    });

    test('LotSnapshotEvent decodes nested state snapshot correctly', () {
      final payload = {
        'auctionId': validAuctionId,
        'lotId': validLotId,
        'sequence': 5,
        'state': {
          'bidCount': 2,
          'closesAt': '2026-07-14T17:02:00.000Z',
          'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
          'lifecycle': 'LIVE',
          'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
          'reserveStatus': 'MET',
        },
      };

      final event = LotSnapshotEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.lotId, validLotId);
      expect(event.sequence, 5);
      expect(event.state.bidCount, 2);
      expect(event.state.currentBid?.amountFils, 8500000);
      expect(event.state.nextMinimumBid.amountFils, 8700000);
      expect(event.state.lifecycle, 'LIVE');
      expect(event.state.reserveStatus, 'MET');
    });

    test('BidAcceptedEvent decodes flat public event (DEC-022)', () {
      final payload = {
        'amount': {'amountFils': 8500000, 'currency': 'AED'},
        'auctionId': validAuctionId,
        'bidKind': 'MANUAL',
        'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
        'extended': true,
        'lotId': validLotId,
        'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
        'reserveStatus': 'MET',
        'sequence': 6,
      };

      final event = BidAcceptedEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.lotId, validLotId);
      expect(event.sequence, 6);
      expect(event.extended, isTrue);
      expect(event.currentBid.amountFils, 8500000);
      expect(event.nextMinimumBid.amountFils, 8700000);
    });

    test('AuctionExtendedEvent decodes correctly', () {
      final payload = {
        'auctionId': validAuctionId,
        'closesAt': '2026-07-14T17:05:00.000Z',
        'extensionCount': 2,
        'lotId': validLotId,
        'sequence': 7,
      };

      final event = AuctionExtendedEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.extensionCount, 2);
      expect(event.closesAt, '2026-07-14T17:05:00.000Z');
      expect(event.sequence, 7);
    });

    test('AuctionStateChangedEvent decodes correctly', () {
      final payload = {
        'auctionId': validAuctionId,
        'lifecycle': 'CLOSED',
        'previousLifecycle': 'LIVE',
        'lotId': validLotId,
        'sequence': 8,
      };

      final event = AuctionStateChangedEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.lifecycle, 'CLOSED');
      expect(event.previousLifecycle, 'LIVE');
      expect(event.sequence, 8);
    });

    test('ReserveStatusChangedEvent decodes correctly', () {
      final payload = {
        'auctionId': validAuctionId,
        'lotId': validLotId,
        'reserveStatus': 'MET',
        'sequence': 9,
      };

      final event = ReserveStatusChangedEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.reserveStatus, 'MET');
      expect(event.sequence, 9);
    });

    test('LotPresenceChangedEvent decodes viewersCount correctly', () {
      final payload = {
        'lotId': validLotId,
        'viewersCount': 14,
      };

      final event = LotPresenceChangedEvent.fromJson(payload);
      expect(event, isNotNull);
      expect(event!.lotId, validLotId);
      expect(event.viewersCount, 14);
    });

    test('MyBidStatusChangedEvent decodes personal enveloped data', () {
      final envelope = {
        'data': {
          'closesAt': '2026-07-14T17:05:00.000Z',
          'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
          'lotId': validLotId,
          'lotSequence': 6,
          'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
          'status': 'WINNING',
        }
      };

      final event = MyBidStatusChangedEvent.fromEnveloped(envelope);
      expect(event, isNotNull);
      expect(event!.lotId, validLotId);
      expect(event.lotSequence, 6);
      expect(event.status, 'WINNING');
      expect(event.currentBid!.amountFils, 8500000);
    });

    test('ProxyBidChangedEvent decodes personal enveloped proxy data', () {
      final envelope = {
        'data': {
          'lotId': validLotId,
          'maximum': {'amountFils': 9000000, 'currency': 'AED'},
          'status': 'ACTIVE',
        }
      };

      final event = ProxyBidChangedEvent.fromEnveloped(envelope);
      expect(event, isNotNull);
      expect(event!.lotId, validLotId);
      expect(event.maximum!.amountFils, 9000000);
      expect(event.status, 'ACTIVE');
    });

    test('Malformed payloads safely return null instead of throwing', () {
      expect(ServerHelloEvent.fromJson(null), isNull);
      expect(ServerHelloEvent.fromJson({}), isNull);
      expect(LotSnapshotEvent.fromJson({'lotId': 'invalid'}), isNull);
      expect(BidAcceptedEvent.fromJson({'sequence': 'not-a-number'}), isNull);
      expect(MyBidStatusChangedEvent.fromEnveloped({}), isNull);
      expect(MyBidStatusChangedEvent.fromEnveloped({'data': null}), isNull);
    });
  });
}
