import 'package:flutter/foundation.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import '../network/api_client.dart';
import '../network/api_config.dart';
import '../network/api_result.dart';

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

  ApiClient? _apiClient;
  ApiClient get apiClient => _apiClient ?? ApiClient();
  void configureApiClient(ApiClient client) {
    _apiClient = client;
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

  void revokeTerms(String versionId) {
    _acceptedTerms.remove(versionId);
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

  // --- Task 008: KYC & Emirates ID Verification State ---
  MobileKycStatus _kycStatus = MobileKycStatus.unverified;
  MobileKycStatus get kycStatus => _kycStatus;

  VerifiedIdentity? _verifiedIdentity;
  VerifiedIdentity? get verifiedIdentity => _verifiedIdentity;

  bool get isKycVerified => _kycStatus == MobileKycStatus.verified;

  void setKycStatus(MobileKycStatus status) {
    _kycStatus = status;
    notifyListeners();
  }

  void resetKycForTesting() {
    _kycStatus = MobileKycStatus.unverified;
    _verifiedIdentity = null;
    notifyListeners();
  }

  Future<MobileKycStatus> loadKycStatus({ApiClient? client}) async {
    final resolvedClient = client ?? _apiClient ?? ApiClient();
    final result = await resolvedClient.fetchKycStatus(testAccountId: _testAccountId);
    if (result is ApiSuccess<KycStatusResponse>) {
      _kycStatus = _mapContractKycStatus(result.data.status);
      if (_kycStatus == MobileKycStatus.verified && result.data.bidderNumber != null) {
        _verifiedIdentity = VerifiedIdentity(
          maskedId: '784-****-*******-1',
          fullNameEn: 'Verified User',
          nationality: 'United Arab Emirates',
          bidderPaddleNumber: result.data.bidderNumber!,
          verifiedAt: DateTime.now(),
        );
      }
      notifyListeners();
    }
    return _kycStatus;
  }

  Future<ApiResult<SubmitKycResponse>> submitKycVerification({
    required String emiratesIdNumber,
    required String fullNameEn,
    String? fullNameAr,
    required String nationality,
    required String dateOfBirth,
    required String expiryDate,
    required String cardFrontRef,
    required String cardBackRef,
    String? selfieRef,
    ApiClient? client,
  }) async {
    _kycStatus = MobileKycStatus.pending;
    notifyListeners();

    final resolvedClient = client ?? _apiClient ?? ApiClient();
    final request = SubmitKycRequest(
      cardBackRef: cardBackRef,
      cardFrontRef: cardFrontRef,
      dateOfBirth: dateOfBirth,
      emiratesIdNumber: emiratesIdNumber,
      expiryDate: expiryDate,
      fullNameAr: fullNameAr,
      fullNameEn: fullNameEn,
      nationality: nationality,
      selfieRef: selfieRef,
    );

    final result = await resolvedClient.submitKycVerification(
      request: request,
      testAccountId: _testAccountId,
    );

    if (result is ApiSuccess<SubmitKycResponse>) {
      _kycStatus = _mapContractKycStatus(result.data.status);
      if (_kycStatus == MobileKycStatus.verified) {
        _verifiedIdentity = VerifiedIdentity(
          maskedId: _maskEmiratesId(emiratesIdNumber),
          fullNameEn: fullNameEn,
          fullNameAr: fullNameAr,
          nationality: nationality,
          bidderPaddleNumber: result.data.bidderNumber ??
              'Paddle #${_testAccountId.length >= 4 ? _testAccountId.substring(_testAccountId.length - 4) : "2456"}',
          verifiedAt: result.data.verifiedAt ?? DateTime.now(),
        );
      }
    } else {
      _kycStatus = MobileKycStatus.unverified;
    }
    notifyListeners();
    return result;
  }

  static String _maskEmiratesId(String id) {
    if (id.length >= 18) {
      return '${id.substring(0, 4)}****-*******-${id.substring(id.length - 1)}';
    }
    return '784-****-*******-1';
  }

  static MobileKycStatus _mapContractKycStatus(KycStatusResponseStatus status) {
    switch (status) {
      case KycStatusResponseStatus.VERIFIED:
        return MobileKycStatus.verified;
      case KycStatusResponseStatus.PENDING:
        return MobileKycStatus.pending;
      case KycStatusResponseStatus.REJECTED:
        return MobileKycStatus.rejected;
      case KycStatusResponseStatus.UNVERIFIED:
        return MobileKycStatus.unverified;
    }
  }
}

enum MobileKycStatus {
  unverified,
  pending,
  verified,
  rejected,
}

class VerifiedIdentity {
  final String maskedId;
  final String fullNameEn;
  final String? fullNameAr;
  final String nationality;
  final String bidderPaddleNumber;
  final DateTime? verifiedAt;

  const VerifiedIdentity({
    required this.maskedId,
    required this.fullNameEn,
    this.fullNameAr,
    required this.nationality,
    required this.bidderPaddleNumber,
    this.verifiedAt,
  });

  /// Masked Emirates ID for display purposes
  String get emiratesIdNumber => maskedId;
}

