import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:pioneer_mobile/core/network/api_client.dart';
import 'package:pioneer_mobile/core/network/api_config.dart';
import 'package:pioneer_mobile/core/network/api_result.dart';
import 'package:pioneer_mobile/core/utils/uuid_service.dart';

void main() {
  const validLotId = '11111111-1111-4111-8111-111111111111';
  const validAuctionId = '22222222-2222-4222-8222-222222222222';
  const validCommandId = '33333333-3333-4333-8333-333333333333';
  const validTestAccountId = 'bd44b2e8-5e31-4e04-b0bf-cf5b2146192f';
  const validTermsVersionId = '5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d';

  group('ApiClient REST & Authentication Parity', () {
    test('defaultHeaders contains x-pioneer-test-account-id and correlation id', () {
      final headers = ApiConfig.defaultHeaders(
        correlationId: 'test-corr-123',
        testAccountId: validTestAccountId,
        idempotencyKey: validCommandId,
      );

      expect(headers['x-pioneer-test-account-id'], validTestAccountId);
      expect(headers['x-correlation-id'], 'test-corr-123');
      expect(headers['idempotency-key'], validCommandId);
      expect(headers['content-type'], 'application/json');
      expect(headers['accept'], 'application/json');
    });

    test('UuidService generates valid RFC 4122 v4 UUIDs', () {
      final uuid = UuidService.generate();
      expect(UuidService.isValid(uuid), isTrue);
      expect(UuidService.isValid(validLotId), isTrue);
      expect(UuidService.isValid('lot-001'), isFalse);
    });

    test('fetchLots decodes {contractVersion, items} list response correctly', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/lots') {
          final payload = {
            'contractVersion': 1,
            'items': [
              {
                'lotId': validLotId,
                'auctionId': validAuctionId,
                'lotNumber': '101',
                'titleEn': '2024 BMW X5 M-Sport',
                'titleAr': 'بي ام دبليو إكس 5 2024',
                'lifecycle': 'LIVE',
                'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
                'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
                'reserveStatus': 'MET',
                'closesAt': '2026-07-14T17:00:00.000Z',
                'contractVersion': 1,
              }
            ],
          };
          return http.Response(
            json.encode(payload),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final result = await client.fetchLots();

      expect(result, isA<ApiSuccess<List<dynamic>>>());
      final lots = (result as ApiSuccess).data;
      expect(lots.length, 1);
      expect(lots[0].lotId, validLotId);
      expect(lots[0].lotNumber, '101');
      expect(lots[0].currentBidAed, 85000.0);
      expect(lots[0].nextMinimumBidAed, 87000.0);
      expect(lots[0].isLive, isTrue);
      expect(lots[0].isReserveMet, isTrue);
    });

    test('fetchLot decodes single PublicLotCard correctly', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/lots/$validLotId') {
          final payload = {
            'lotId': validLotId,
            'auctionId': validAuctionId,
            'lotNumber': '101',
            'titleEn': '2024 BMW X5 M-Sport',
            'titleAr': 'بي ام دبليو إكس 5 2024',
            'lifecycle': 'LIVE',
            'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
            'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
            'reserveStatus': 'MET',
            'closesAt': '2026-07-14T17:00:00.000Z',
            'contractVersion': 1,
          };
          return http.Response(
            json.encode(payload),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final result = await client.fetchLot(validLotId);

      expect(result, isA<ApiSuccess>());
      final lot = (result as ApiSuccess).data;
      expect(lot.lotId, validLotId);
      expect(lot.titleEn, '2024 BMW X5 M-Sport');
    });

    test('placeBid sends Idempotency-Key and matches REST request body contract', () async {
      http.Request? capturedRequest;

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/lots/$validLotId/bids') {
          capturedRequest = request;
          final responseAck = {
            'commandId': validCommandId,
            'contractVersion': 1,
            'correlationId': 'cor-test-123',
            'serverTime': '2026-07-14T17:00:00.000Z',
            'status': 'ACCEPTED',
            'result': {
              'lotId': validLotId,
              'sequence': 42,
              'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
              'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
              'myBidStatus': 'WINNING',
              'reserveStatus': 'MET',
              'extended': false,
              'closesAt': '2026-07-14T17:05:00.000Z',
            },
          };
          return http.Response(json.encode(responseAck), 200);
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final result = await client.placeBid(
        lotId: validLotId,
        amountFils: 8500000,
        commandId: validCommandId,
        expectedSequence: 41,
        termsVersionId: validTermsVersionId,
        testAccountId: validTestAccountId,
      );

      expect(result, isA<ApiSuccess<CommandAck>>());
      final ack = (result as ApiSuccess<CommandAck>).data;
      expect(ack.status, CommandAckStatus.ACCEPTED);
      expect(ack.result?.sequence, 42);

      // Verify request shape
      expect(capturedRequest, isNotNull);
      expect(capturedRequest!.headers['idempotency-key'], validCommandId);
      expect(capturedRequest!.headers['x-pioneer-test-account-id'], validTestAccountId);

      final body = json.decode(capturedRequest!.body);
      expect(body['amount']['amountFils'], 8500000);
      expect(body['amount']['currency'], 'AED');
      expect(body['expectedSequence'], 41);
      expect(body['termsVersionId'], validTermsVersionId);
      // REST body must NOT contain redundant commandId or contractVersion
      expect(body.containsKey('commandId'), isFalse);
      expect(body.containsKey('contractVersion'), isFalse);
    });

    test('placeBid on timeout returns ApiUnknown retaining the commandId', () async {
      final mockClient = MockClient((request) async {
        throw TimeoutException('Simulated transport timeout');
      });

      final client = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final result = await client.placeBid(
        lotId: validLotId,
        amountFils: 8500000,
        commandId: validCommandId,
      );

      expect(result, isA<ApiUnknown<CommandAck>>());
      final unknown = result as ApiUnknown<CommandAck>;
      expect(unknown.commandId, validCommandId);
    });

    test('placeBid on rejection returns ApiFailure with structured error and latest state', () async {
      final mockClient = MockClient((request) async {
        final rejectPayload = {
          'commandId': validCommandId,
          'contractVersion': 1,
          'correlationId': 'cor-test-123',
          'serverTime': '2026-07-14T17:00:00.000Z',
          'status': 'REJECTED',
          'error': {
            'code': 'BID_TOO_LOW',
            'message': 'The current bid changed. The next bid is AED 87,000.',
            'retryable': true,
          },
          'latest': {
            'lotId': validLotId,
            'sequence': 43,
            'currentBid': {'amountFils': 8600000, 'currency': 'AED'},
            'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
            'closesAt': '2026-07-14T17:02:00.000Z',
          },
        };
        return http.Response(json.encode(rejectPayload), 200);
      });

      final client = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final result = await client.placeBid(
        lotId: validLotId,
        amountFils: 8500000,
        commandId: validCommandId,
      );

      expect(result, isA<ApiFailure<CommandAck>>());
      final failure = result as ApiFailure<CommandAck>;
      expect(failure.code, 'BID_TOO_LOW');
      expect(failure.retryable, isTrue);
      expect(failure.latest, isNotNull);
      expect(failure.latest?['sequence'], 43);
    });
  });
}
