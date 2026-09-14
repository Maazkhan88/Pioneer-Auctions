import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

abstract class ApiConfig {
  static const int contractVersion = 1;
  static const String socketNamespace = '/auctions/v1';

  // Override via environment or defaults to local dev server
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    // Android emulator loops back to host machine via 10.0.2.2
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  static String get socketUrl => baseUrl;

  // Cloudflare preview fallback endpoint
  static const String previewApiUrl = 'https://pioneer-auctions-api.maaz-n-khan.workers.dev';

  // Default test account header for development / sandbox
  static const String defaultTestAccountId = 'usr-001';

  static Map<String, String> defaultHeaders({String? correlationId, String? testAccountId}) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Contract-Version': '$contractVersion',
      'X-Correlation-Id': correlationId ?? 'cor-${DateTime.now().millisecondsSinceEpoch}',
      'X-Test-Account-Id': testAccountId ?? defaultTestAccountId,
    };
  }
}
