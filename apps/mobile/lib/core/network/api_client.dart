import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'api_config.dart';

class ApiClient {
  final http.Client _httpClient;
  final String baseUrl;

  ApiClient({http.Client? httpClient, String? baseUrl})
      : _httpClient = httpClient ?? http.Client(),
        baseUrl = baseUrl ?? ApiConfig.baseUrl;

  /// Checks if the backend API is online and responding.
  Future<bool> isHealthy() async {
    try {
      final response = await _httpClient
          .get(
            Uri.parse('$baseUrl/api/health'),
            headers: ApiConfig.defaultHeaders(),
          )
          .timeout(const Duration(milliseconds: 1500));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  /// Fetches lots list from the backend API.
  Future<List<Map<String, dynamic>>> fetchLots({String? query, String? category}) async {
    try {
      final queryParams = <String, String>{};
      if (query != null && query.isNotEmpty) queryParams['q'] = query;
      if (category != null && category.isNotEmpty) queryParams['category'] = category;

      final uri = Uri.parse('$baseUrl/api/v1/lots').replace(queryParameters: queryParams.isEmpty ? null : queryParams);
      final response = await _httpClient
          .get(uri, headers: ApiConfig.defaultHeaders())
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final decoded = json.decode(response.body);
        if (decoded is List) {
          return decoded.cast<Map<String, dynamic>>();
        } else if (decoded is Map && decoded['data'] is List) {
          return (decoded['data'] as List).cast<Map<String, dynamic>>();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetches single lot snapshot from the backend.
  Future<LotSnapshot?> fetchLot(String lotId) async {
    try {
      final uri = Uri.parse('$baseUrl/api/v1/lots/$lotId');
      final response = await _httpClient
          .get(uri, headers: ApiConfig.defaultHeaders())
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        return LotSnapshot.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Places a bid via REST endpoint using PlaceBidCommand.
  Future<CommandAck?> placeBid({
    required String lotId,
    required int amountAed,
    int expectedSequence = 0,
    String? testAccountId,
  }) async {
    try {
      final command = PlaceBidCommand(
        commandId: 'cmd-${DateTime.now().millisecondsSinceEpoch}',
        contractVersion: ApiConfig.contractVersion,
        lotId: lotId,
        amount: Amount(
          amountFils: amountAed * 100, // 1 AED = 100 fils
          currency: Currency.AED,
        ),
        expectedSequence: expectedSequence,
        sentAt: DateTime.now().toUtc(),
        termsVersionId: 'terms-v1',
      );

      final uri = Uri.parse('$baseUrl/api/v1/lots/$lotId/bids');
      final response = await _httpClient
          .post(
            uri,
            headers: ApiConfig.defaultHeaders(testAccountId: testAccountId),
            body: json.encode(command.toJson()),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data = json.decode(response.body);
        return CommandAck.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
