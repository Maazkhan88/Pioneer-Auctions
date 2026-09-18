import 'package:pioneer_contracts/pioneer_contracts.dart';
import '../data/pioneer_mock_repository.dart';
import '../models/auction_model.dart';
import '../models/lot_model.dart';
import '../models/public_lot_card.dart';
import 'api_client.dart';
import 'api_result.dart';

/// Repository coordinating live backend REST endpoints and offline demo fallback.
///
/// CRITICAL INVARIANTS:
/// 1. Unknown lot IDs return `null` (404), never a silent mock substitution.
/// 2. Never optimistically fabricates winning bid status without authoritative server ack.
/// 3. Retains identical `commandId` for timeouts and retries.
class PioneerRepository {
  static final PioneerRepository instance = PioneerRepository._internal();
  factory PioneerRepository() => instance;
  PioneerRepository._internal();

  final ApiClient _apiClient = ApiClient();
  final PioneerMockRepository _mockRepo = PioneerMockRepository.instance;

  bool _isOnline = false;
  bool get isOnline => _isOnline;

  bool _isDemoMode = false;
  bool get isDemoMode => _isDemoMode;

  /// Checks connectivity to backend.
  Future<bool> checkConnectivity() async {
    _isOnline = await _apiClient.isHealthy();
    _isDemoMode = !_isOnline;
    return _isOnline;
  }

  /// Returns list of auctions.
  List<AuctionItem> getAuctions() {
    return _mockRepo.getAuctions();
  }

  /// Fetches lots from live backend `GET /api/v1/lots`, falling back to mock lots
  /// if offline or backend is unreachable.
  Future<List<LotItem>> getLots({
    LotCategory? category,
    String? searchQuery,
    bool forceLive = false,
  }) async {
    if (_isOnline || forceLive) {
      final result = await _apiClient.fetchLots();
      if (result is ApiSuccess<List<PublicLotCard>>) {
        _isOnline = true;
        _isDemoMode = false;
        var liveLots = result.data.map((c) => LotItem.fromPublicCard(c)).toList();
        if (category != null) {
          liveLots = liveLots.where((l) => l.category == category).toList();
        }
        if (searchQuery != null && searchQuery.isNotEmpty) {
          liveLots = liveLots
              .where((l) => l.title.toLowerCase().contains(searchQuery.toLowerCase()))
              .toList();
        }
        return liveLots;
      }
    }

    // Offline / Demo fallback
    _isDemoMode = true;
    var lots = _mockRepo.getLots();
    if (category != null) {
      lots = lots.where((l) => l.category == category).toList();
    }
    if (searchQuery != null && searchQuery.isNotEmpty) {
      lots = lots
          .where((l) => l.title.toLowerCase().contains(searchQuery.toLowerCase()))
          .toList();
    }
    return lots;
  }

  /// Returns single lot item by ID, or `null` if not found.
  /// Strict requirement: NEVER returns mock substitute for unknown lot ID!
  Future<LotItem?> getLotById(String id) async {
    if (_isOnline) {
      final result = await _apiClient.fetchLot(id);
      if (result is ApiSuccess<PublicLotCard>) {
        return LotItem.fromPublicCard(result.data);
      }
    }

    // Check mock repository explicitly for this specific ID
    try {
      final match = _mockRepo.getLots().firstWhere((l) => l.id == id);
      return match;
    } catch (_) {
      // Not found: Return null (driving a 404 Lot Not Found screen)
      return null;
    }
  }

  /// Places a bid via live REST API.
  /// Returns typed `ApiResult<CommandAck>`, preserving `commandId` idempotency.
  /// Network failures or timeouts remain ApiUnknown and are never synthesized.
  Future<ApiResult<CommandAck>> placeBid({
    required String lotId,
    required int amountFils,
    required String commandId,
    int expectedSequence = 0,
    String? termsVersionId,
  }) async {
    return _apiClient.placeBid(
      lotId: lotId,
      amountFils: amountFils,
      commandId: commandId,
      expectedSequence: expectedSequence,
      termsVersionId: termsVersionId,
    );
  }
}
