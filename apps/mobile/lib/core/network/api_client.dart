import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:pioneer_contracts/pioneer_contracts.dart';
import '../models/public_lot_card.dart';
import '../utils/uuid_service.dart';
import 'api_config.dart';
import 'api_result.dart';

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
          .timeout(const Duration(milliseconds: 2000));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  /// Fetches public lot cards list from GET /api/v1/lots.
  /// Backend returns `{ contractVersion: 1, items: PublicLotCard[], total, limit, offset }`.
  Future<ApiResult<List<PublicLotCard>>> fetchLots({
    String? q,
    String? category,
    String? status,
    int? minPriceFils,
    int? maxPriceFils,
    String? sort,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (q != null && q.trim().isNotEmpty) queryParams['q'] = q.trim();
      if (category != null && category.isNotEmpty) queryParams['category'] = category;
      if (status != null && status.isNotEmpty) queryParams['status'] = status;
      if (minPriceFils != null) queryParams['minPriceFils'] = minPriceFils.toString();
      if (maxPriceFils != null) queryParams['maxPriceFils'] = maxPriceFils.toString();
      if (sort != null && sort.isNotEmpty) queryParams['sort'] = sort;
      if (limit != null) queryParams['limit'] = limit.toString();
      if (offset != null) queryParams['offset'] = offset.toString();

      final uri = Uri.parse('$baseUrl/api/v1/lots').replace(
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final response = await _httpClient
          .get(uri, headers: ApiConfig.defaultHeaders())
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final decoded = json.decode(utf8.decode(response.bodyBytes));
        if (decoded is Map<String, dynamic>) {
          final contractVersion = decoded['contractVersion'] as int?;
          if (contractVersion != 1) {
            return const ApiFailure(
              code: 'UNSUPPORTED_CONTRACT_VERSION',
              message: 'Server returned unsupported contract version.',
            );
          }
          final parsed = PublicLotsResponse.fromJson(decoded);
          return ApiSuccess(parsed.items);
        }
        return const ApiFailure(
          code: 'MALFORMED_RESPONSE',
          message: 'Expected object with items array.',
        );
      }

      return _parseErrorResponse(response);
    } on TimeoutException catch (e) {
      return ApiUnknown(message: 'Request timed out fetching lots list: $e', cause: e);
    } catch (e) {
      return ApiUnknown(message: 'Failed to connect to backend: $e', cause: e);
    }
  }

  /// Fetches single lot details from GET /api/v1/lots/:lotId.
  /// Returns a single PublicLotCard (NOT LotSnapshot).
  Future<ApiResult<PublicLotCard>> fetchLot(String lotId) async {
    try {
      final uri = Uri.parse('$baseUrl/api/v1/lots/$lotId');
      final response = await _httpClient
          .get(uri, headers: ApiConfig.defaultHeaders())
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> decoded = json.decode(utf8.decode(response.bodyBytes));
        final card = PublicLotCard.fromJson(decoded);
        return ApiSuccess(card);
      }

      return _parseErrorResponse(response);
    } on TimeoutException catch (e) {
      return ApiUnknown(message: 'Request timed out fetching lot details: $e', cause: e);
    } catch (e) {
      return ApiUnknown(message: 'Failed to connect to backend: $e', cause: e);
    }
  }

  /// Places a manual bid via POST /api/v1/lots/:lotId/bids.
  /// Preserves [commandId] as Idempotency-Key.
  Future<ApiResult<CommandAck>> placeBid({
    required String lotId,
    required int amountFils,
    required String commandId,
    int expectedSequence = 0,
    String? termsVersionId,
    String? testAccountId,
    String? correlationId,
  }) async {
    final corrId = correlationId ?? 'cor-${UuidService.generate().substring(0, 8)}';
    final payload = {
      'amount': {
        'amountFils': amountFils,
        'currency': 'AED',
      },
      'expectedSequence': expectedSequence,
      'termsVersionId': termsVersionId ?? ApiConfig.termsVersionId,
    };

    try {
      final uri = Uri.parse('$baseUrl/api/v1/lots/$lotId/bids');
      final response = await _httpClient
          .post(
            uri,
            headers: ApiConfig.defaultHeaders(
              correlationId: corrId,
              testAccountId: testAccountId,
              idempotencyKey: commandId,
            ),
            body: json.encode(payload),
          )
          .timeout(const Duration(seconds: 5));

      final Map<String, dynamic> decoded = json.decode(utf8.decode(response.bodyBytes));
      final ack = CommandAck.fromJson(decoded);

      if (ack.status == CommandAckStatus.ACCEPTED) {
        return ApiSuccess(ack, correlationId: corrId);
      } else {
        return ApiFailure(
          code: ack.error?.code.name ?? 'REJECTED',
          message: ack.error?.message ?? 'Bid was rejected by the server.',
          retryable: ack.error?.retryable ?? false,
          retryAfterMs: ack.error?.retryAfterMs,
          latest: ack.latest?.toJson(),
          correlationId: corrId,
        );
      }
    } on TimeoutException catch (e) {
      // Timeout is strictly unknown - never rejected and never accepted!
      return ApiUnknown(
        commandId: commandId,
        message: 'Timeout awaiting bid acknowledgement. Retaining commandId for reconciliation.',
        cause: e,
      );
    } catch (e) {
      return ApiUnknown(
        commandId: commandId,
        message: 'Network error awaiting bid acknowledgement.',
        cause: e,
      );
    }
  }

  /// Creates or raises proxy maximum via PUT /api/v1/lots/:lotId/proxy-bid.
  Future<ApiResult<Map<String, dynamic>>> setProxyBid({
    required String lotId,
    required int maximumFils,
    required String commandId,
    int expectedSequence = 0,
    String? termsVersionId,
    String? testAccountId,
    String? correlationId,
  }) async {
    final corrId = correlationId ?? 'cor-${UuidService.generate().substring(0, 8)}';
    final payload = {
      'maximum': {
        'amountFils': maximumFils,
        'currency': 'AED',
      },
      'expectedSequence': expectedSequence,
      'termsVersionId': termsVersionId ?? ApiConfig.termsVersionId,
    };

    try {
      final uri = Uri.parse('$baseUrl/api/v1/lots/$lotId/proxy-bid');
      final response = await _httpClient
          .put(
            uri,
            headers: ApiConfig.defaultHeaders(
              correlationId: corrId,
              testAccountId: testAccountId,
              idempotencyKey: commandId,
            ),
            body: json.encode(payload),
          )
          .timeout(const Duration(seconds: 5));

      final Map<String, dynamic> decoded = json.decode(utf8.decode(response.bodyBytes));
      if (decoded['status'] == 'ACCEPTED') {
        return ApiSuccess(decoded, correlationId: corrId);
      } else {
        final error = decoded['error'] as Map<String, dynamic>?;
        return ApiFailure(
          code: error?['code']?.toString() ?? 'PROXY_REJECTED',
          message: error?['message']?.toString() ?? 'Proxy bid rejected.',
          retryable: error?['retryable'] as bool? ?? false,
          latest: decoded['latest'] as Map<String, dynamic>?,
          correlationId: corrId,
        );
      }
    } on TimeoutException catch (e) {
      return ApiUnknown(
        commandId: commandId,
        message: 'Timeout awaiting proxy bid acknowledgement.',
        cause: e,
      );
    } catch (e) {
      return ApiUnknown(
        commandId: commandId,
        message: 'Network error awaiting proxy bid acknowledgement.',
        cause: e,
      );
    }
  }

  /// Helper to extract ApiFailure from non-2xx HTTP responses.
  ApiFailure<T> _parseErrorResponse<T>(http.Response response) {
    try {
      final decoded = json.decode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        if (decoded['error'] is Map<String, dynamic>) {
          final err = decoded['error'] as Map<String, dynamic>;
          return ApiFailure(
            code: err['code']?.toString() ?? 'HTTP_${response.statusCode}',
            message: err['message']?.toString() ?? 'Server error',
            retryable: err['retryable'] as bool? ?? false,
          );
        }
        if (decoded['code'] != null) {
          return ApiFailure(
            code: decoded['code'].toString(),
            message: decoded['message']?.toString() ?? 'Error',
          );
        }
      }
    } catch (_) {}

    return ApiFailure(
      code: 'HTTP_${response.statusCode}',
      message: 'Server returned HTTP status ${response.statusCode}',
    );
  }

  /// Fetches current KYC status from GET /api/v1/me/kyc.
  Future<ApiResult<KycStatusResponse>> fetchKycStatus({
    String? testAccountId,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/v1/me/kyc');
      final response = await _httpClient
          .get(
            uri,
            headers: ApiConfig.defaultHeaders(testAccountId: testAccountId),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> decoded =
            json.decode(utf8.decode(response.bodyBytes));
        final kycStatus = KycStatusResponse.fromJson(decoded);
        return ApiSuccess(kycStatus);
      }

      return _parseErrorResponse(response);
    } on TimeoutException catch (e) {
      return ApiUnknown(
        message: 'Request timed out fetching KYC status: $e',
        cause: e,
      );
    } catch (e) {
      return ApiUnknown(
        message: 'Failed to connect to backend for KYC status: $e',
        cause: e,
      );
    }
  }

  /// Submits Emirates ID KYC verification to POST /api/v1/me/kyc/submit.
  Future<ApiResult<SubmitKycResponse>> submitKycVerification({
    required SubmitKycRequest request,
    String? testAccountId,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/v1/me/kyc/submit');
      final response = await _httpClient
          .post(
            uri,
            headers: ApiConfig.defaultHeaders(testAccountId: testAccountId),
            body: json.encode(request.toJson()),
          )
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final Map<String, dynamic> decoded =
            json.decode(utf8.decode(response.bodyBytes));
        final submitResponse = SubmitKycResponse.fromJson(decoded);
        return ApiSuccess(submitResponse);
      }

      return _parseErrorResponse(response);
    } on TimeoutException catch (e) {
      return ApiUnknown(
        message: 'Request timed out submitting KYC verification: $e',
        cause: e,
      );
    } catch (e) {
      return ApiUnknown(
        message: 'Failed to connect to backend for KYC submission: $e',
        cause: e,
      );
    }
  }
}
