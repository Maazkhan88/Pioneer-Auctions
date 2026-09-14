import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import '../utils/uuid_service.dart';

abstract class ApiConfig {
  static const int contractVersion = 1;
  static const String socketNamespace = '/auctions/v1';

  /// Seeded valid PostgreSQL buyer UUID from dev seed data (docs/current-state.md line 151).
  static const String defaultTestAccountId = 'bd44b2e8-5e31-4e04-b0bf-cf5b2146192f';

  /// Contracted valid terms version UUID from API contracts (docs/api-contracts.md line 245).
  static const String defaultTermsVersionId = '5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d';

  /// Configurable via `--dart-define=PIONEER_API_BASE_URL=...`
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('PIONEER_API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;

    if (kIsWeb) return 'http://localhost:3000';
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }

  /// Configurable via `--dart-define=PIONEER_SOCKET_URL=...`
  static String get socketUrl {
    const fromEnv = String.fromEnvironment('PIONEER_SOCKET_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return baseUrl;
  }

  /// Configurable via `--dart-define=PIONEER_TEST_ACCOUNT_ID=...`
  static String get testAccountId {
    const fromEnv = String.fromEnvironment('PIONEER_TEST_ACCOUNT_ID');
    if (fromEnv.isNotEmpty) return fromEnv;
    return defaultTestAccountId;
  }

  /// Configurable via `--dart-define=PIONEER_TERMS_VERSION_ID=...`
  static String get termsVersionId {
    const fromEnv = String.fromEnvironment('PIONEER_TERMS_VERSION_ID');
    if (fromEnv.isNotEmpty) return fromEnv;
    return defaultTermsVersionId;
  }

  /// Configurable via `--dart-define=PIONEER_DEMO_MODE=true`
  static bool get isDemoMode {
    return const bool.fromEnvironment('PIONEER_DEMO_MODE', defaultValue: false);
  }

  /// Standard HTTP headers matching NestJS backend requirements.
  /// Uses exact backend header: `x-pioneer-test-account-id`.
  static Map<String, String> defaultHeaders({
    String? correlationId,
    String? testAccountId,
    String? idempotencyKey,
    String? accessToken,
  }) {
    final headers = <String, String>{
      'content-type': 'application/json',
      'accept': 'application/json',
      'x-correlation-id': correlationId ?? 'cor-${UuidService.generate().substring(0, 8)}',
    };

    if (idempotencyKey != null && idempotencyKey.isNotEmpty) {
      headers['idempotency-key'] = idempotencyKey;
    }

    if (accessToken != null && accessToken.isNotEmpty) {
      headers['authorization'] = 'Bearer $accessToken';
    } else {
      final accountId = testAccountId ?? testAccountIdFromEnv();
      if (accountId.isNotEmpty) {
        headers['x-pioneer-test-account-id'] = accountId;
      }
    }

    return headers;
  }

  static String testAccountIdFromEnv() => testAccountId;
}
