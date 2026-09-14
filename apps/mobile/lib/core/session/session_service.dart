import 'package:flutter/foundation.dart';
import '../network/api_config.dart';

/// Secure session storage interface. Task 008 can wire platform Keychain/Keystore.
abstract class SecureSessionStorage {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

/// Default in-memory secure storage implementation for mobile foundation.
class InMemorySecureStorage implements SecureSessionStorage {
  final Map<String, String> _store = {};

  @override
  Future<String?> read(String key) async => _store[key];

  @override
  Future<void> write(String key, String value) async => _store[key] = value;

  @override
  Future<void> delete(String key) async => _store.remove(key);
}

/// Service managing user session, authentication tokens, watchlist, and test identity.
class SessionService extends ChangeNotifier {
  static final SessionService instance = SessionService._internal();
  factory SessionService() => instance;
  SessionService._internal();

  SecureSessionStorage _storage = InMemorySecureStorage();
  SecureSessionStorage get storage => _storage;
  void configureStorage(SecureSessionStorage storage) {
    _storage = storage;
  }

  String _testAccountId = ApiConfig.testAccountId;
  String get testAccountId => _testAccountId;

  String _termsVersionId = ApiConfig.termsVersionId;
  String get termsVersionId => _termsVersionId;

  String? _accessToken;
  String? get accessToken => _accessToken;

  final Set<String> _watchlist = {};
  Set<String> get watchlist => Set.unmodifiable(_watchlist);

  final Set<String> _acceptedTerms = {};

  void setTestAccountId(String accountId) {
    _testAccountId = accountId;
    notifyListeners();
  }

  void setTermsVersionId(String termsVersionId) {
    _termsVersionId = termsVersionId;
    notifyListeners();
  }

  void setAccessToken(String? token) {
    _accessToken = token;
    notifyListeners();
  }

  bool isWatched(String lotId) => _watchlist.contains(lotId);

  void toggleWatchlist(String lotId) {
    if (_watchlist.contains(lotId)) {
      _watchlist.remove(lotId);
    } else {
      _watchlist.add(lotId);
    }
    notifyListeners();
  }

  bool hasAcceptedTerms(String versionId) => _acceptedTerms.contains(versionId);

  void acceptTerms(String versionId) {
    _acceptedTerms.add(versionId);
    notifyListeners();
  }

  Map<String, String> get authHeaders {
    final headers = <String, String>{};
    if (_accessToken != null && _accessToken!.isNotEmpty) {
      headers['authorization'] = 'Bearer $_accessToken';
    } else if (_testAccountId.isNotEmpty) {
      headers['x-pioneer-test-account-id'] = _testAccountId;
    }
    return headers;
  }
}
