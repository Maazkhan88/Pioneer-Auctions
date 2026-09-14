import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:pioneer_mobile/core/network/api_client.dart';
import 'package:pioneer_mobile/core/network/api_config.dart';

void main() {
  group('ApiClient and Contracts Integration', () {
    test('defaultHeaders contains contract version 1 and correlation id', () {
      final headers = ApiConfig.defaultHeaders(correlationId: 'test-corr-123');
      expect(headers['X-Contract-Version'], '1');
      expect(headers['X-Correlation-Id'], 'test-corr-123');
      expect(headers['X-Test-Account-Id'], 'usr-001');
      expect(headers['Content-Type'], 'application/json');
    });

    test('isHealthy returns true when health endpoint returns 200', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/health') {
          return http.Response(json.encode({'status': 'ok'}), 200);
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final healthy = await apiClient.isHealthy();
      expect(healthy, isTrue);
    });

    test('placeBid sends PlaceBidCommand with integer fils and parses CommandAck', () async {
      http.Request? capturedRequest;

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/lots/lot-001/bids') {
          capturedRequest = request;
          final responseAck = {
            'commandId': 'cmd-123',
            'contractVersion': 1,
            'correlationId': 'cor-123',
            'serverTime': DateTime.now().toUtc().toIso8601String(),
            'status': 'ACCEPTED',
            'result': {
              'lotId': 'lot-001',
              'sequence': 42,
              'currentBid': {'amountFils': 8500000, 'currency': 'AED'},
              'nextMinimumBid': {'amountFils': 8700000, 'currency': 'AED'},
              'myBidStatus': 'WINNING',
              'reserveStatus': 'MET',
              'extended': false,
              'closesAt': DateTime.now().add(const Duration(minutes: 5)).toUtc().toIso8601String(),
            },
          };
          return http.Response(json.encode(responseAck), 200);
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final ack = await apiClient.placeBid(
        lotId: 'lot-001',
        amountAed: 85000,
        expectedSequence: 41,
        testAccountId: 'usr-buyer-99',
      );

      expect(ack, isNotNull);
      expect(ack!.status, CommandAckStatus.ACCEPTED);
      expect(ack.result?.sequence, 42);
      expect(ack.result?.currentBid.amountFils, 8500000);

      // Verify serialized payload sent by ApiClient
      expect(capturedRequest, isNotNull);
      final body = json.decode(capturedRequest!.body);
      expect(body['contractVersion'], 1);
      expect(body['lotId'], 'lot-001');
      expect(body['amount']['amountFils'], 8500000); // 85,000 AED * 100 fils
      expect(body['amount']['currency'], 'AED');
    });

    test('fetchLot parses LotSnapshot correctly', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/lots/lot-001') {
          final snapshotJson = {
            'auctionId': 'auc-001',
            'contractVersion': 1,
            'event': 'lot:snapshot',
            'generatedAt': DateTime.now().toUtc().toIso8601String(),
            'lotId': 'lot-001',
            'sequence': 12,
            'state': {
              'approximateViewerCount': 120,
              'bidCount': 15,
              'closesAt': DateTime.now().add(const Duration(hours: 1)).toUtc().toIso8601String(),
              'currentBid': {'amountFils': 12000000, 'currency': 'AED'},
              'lifecycle': 'LIVE',
              'nextMinimumBid': {'amountFils': 12200000, 'currency': 'AED'},
              'reserveStatus': 'MET',
              'softClose': {
                'enabled': true,
                'extensionCount': 0,
                'extensionMs': 60000,
                'windowMs': 120000,
              },
              'startsAt': DateTime.now().subtract(const Duration(hours: 2)).toUtc().toIso8601String(),
            },
          };
          return http.Response(json.encode(snapshotJson), 200);
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      final lot = await apiClient.fetchLot('lot-001');
      expect(lot, isNotNull);
      expect(lot!.lotId, 'lot-001');
      expect(lot.sequence, 12);
      expect(lot.state.currentBid?.amountFils, 12000000);
      expect(lot.state.reserveStatus, ReserveStatus.MET);
      expect(lot.state.lifecycle, Lifecycle.LIVE);
    });
  });
}
