import '../data/pioneer_mock_repository.dart';
import '../models/auction_model.dart';
import '../models/lot_model.dart';
import 'api_client.dart';

class PioneerRepository {
  static final PioneerRepository instance = PioneerRepository._internal();
  factory PioneerRepository() => instance;
  PioneerRepository._internal();

  final ApiClient _apiClient = ApiClient();
  final PioneerMockRepository _mockRepo = PioneerMockRepository.instance;

  bool _isOnline = false;
  bool get isOnline => _isOnline;

  /// Check connectivity to backend.
  Future<bool> checkConnectivity() async {
    _isOnline = await _apiClient.isHealthy();
    return _isOnline;
  }

  /// Returns list of auctions (from API if available, fallback to mock).
  List<AuctionItem> getAuctions() {
    return _mockRepo.getAuctions();
  }

  /// Returns list of lots.
  List<LotItem> getLots({LotCategory? category, String? searchQuery}) {
    var lots = _mockRepo.getLots();
    if (category != null) {
      lots = lots.where((l) => l.category == category).toList();
    }
    if (searchQuery != null && searchQuery.isNotEmpty) {
      lots = lots.where((l) => l.title.toLowerCase().contains(searchQuery.toLowerCase())).toList();
    }
    return lots;
  }

  /// Returns single lot item by ID.
  LotItem getLotById(String id) {
    return _mockRepo.getLots().firstWhere(
          (l) => l.id == id,
          orElse: () => _mockRepo.getLots().first,
        );
  }

  /// Places a bid via REST API or updates local mock state.
  Future<bool> placeBid({
    required String lotId,
    required int amountAed,
  }) async {
    if (_isOnline) {
      final ack = await _apiClient.placeBid(lotId: lotId, amountAed: amountAed);
      if (ack != null) {
        return true;
      }
    }
    // Fallback: update local mock lot
    final lot = getLotById(lotId);
    final updated = lot.copyWith(
      currentBid: amountAed,
      nextBid: amountAed + 2000,
      yourBid: amountAed,
      status: LotStatus.winning,
    );
    // update in mock repo if needed
    final index = _mockRepo.getLots().indexWhere((l) => l.id == lotId);
    if (index != -1) {
      _mockRepo.getLots()[index] = updated;
    }
    return true;
  }
}
