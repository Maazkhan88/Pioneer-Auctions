enum LotCategory {
  vehicles,
  realEstate,
  generalMaterials,
}

enum LotStatus {
  live,
  upcoming,
  registered,
  endingSoon,
  winning,
  outbid,
  won,
  lost,
}

class LotItem {
  final String id;
  final String lotNumber;
  final String title;
  final LotCategory category;
  final LotStatus status;
  final int currentBid;
  final int? yourBid;
  final int nextBid;
  final int startingBid;
  final Duration timeRemaining;
  final String location;
  final String imagePath;
  final List<String> thumbnails;
  final Map<String, String> specs;
  final bool isWatchlisted;
  final int watchingCount;
  final int bidCount;
  final String? auctionTitle;
  final String? overviewDescription;

  const LotItem({
    required this.id,
    required this.lotNumber,
    required this.title,
    required this.category,
    required this.status,
    required this.currentBid,
    this.yourBid,
    required this.nextBid,
    this.startingBid = 0,
    required this.timeRemaining,
    required this.location,
    required this.imagePath,
    this.thumbnails = const [],
    this.specs = const {},
    this.isWatchlisted = false,
    this.watchingCount = 0,
    this.bidCount = 0,
    this.auctionTitle,
    this.overviewDescription,
  });

  factory LotItem.fromPublicCard(dynamic card) {
    // Dynamic to avoid circular dependency if needed, or typed
    final titleEn = card.titleEn?.toString() ?? '';
    final titleLower = titleEn.toLowerCase();
    LotCategory category = LotCategory.vehicles;
    if (titleLower.contains('villa') ||
        titleLower.contains('apartment') ||
        titleLower.contains('land') ||
        titleLower.contains('building')) {
      category = LotCategory.realEstate;
    } else if (titleLower.contains('caterpillar') ||
        titleLower.contains('generator') ||
        titleLower.contains('machinery') ||
        titleLower.contains('crane')) {
      category = LotCategory.generalMaterials;
    }

    LotStatus status = LotStatus.upcoming;
    if (card.lifecycle == 'LIVE') {
      status = LotStatus.live;
    } else if (card.lifecycle == 'CLOSED' || card.lifecycle == 'CANCELLED') {
      status = LotStatus.lost;
    }

    final currentBidAed = (card.currentBidAed as num?)?.round() ?? 0;
    final nextBidAed = (card.nextMinimumBidAed as num?)?.round() ?? (currentBidAed + 1000);
    final closesAt = card.closesAt is DateTime ? card.closesAt as DateTime : DateTime.now().add(const Duration(hours: 2));
    final diff = closesAt.difference(DateTime.now().toUtc());

    return LotItem(
      id: card.lotId.toString(),
      lotNumber: card.lotNumber.toString(),
      title: titleEn,
      category: category,
      status: status,
      currentBid: currentBidAed,
      nextBid: nextBidAed,
      startingBid: currentBidAed,
      timeRemaining: diff.isNegative ? Duration.zero : diff,
      location: 'Dubai, UAE',
      imagePath: 'assets/images/sample_bmw.png',
      bidCount: 1,
    );
  }

  LotItem copyWith({
    String? id,
    String? lotNumber,
    String? title,
    LotCategory? category,
    LotStatus? status,
    int? currentBid,
    int? yourBid,
    int? nextBid,
    int? startingBid,
    Duration? timeRemaining,
    String? location,
    String? imagePath,
    List<String>? thumbnails,
    Map<String, String>? specs,
    bool? isWatchlisted,
    int? watchingCount,
    int? bidCount,
    String? auctionTitle,
    String? overviewDescription,
  }) {
    return LotItem(
      id: id ?? this.id,
      lotNumber: lotNumber ?? this.lotNumber,
      title: title ?? this.title,
      category: category ?? this.category,
      status: status ?? this.status,
      currentBid: currentBid ?? this.currentBid,
      yourBid: yourBid ?? this.yourBid,
      nextBid: nextBid ?? this.nextBid,
      startingBid: startingBid ?? this.startingBid,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      location: location ?? this.location,
      imagePath: imagePath ?? this.imagePath,
      thumbnails: thumbnails ?? this.thumbnails,
      specs: specs ?? this.specs,
      isWatchlisted: isWatchlisted ?? this.isWatchlisted,
      watchingCount: watchingCount ?? this.watchingCount,
      bidCount: bidCount ?? this.bidCount,
      auctionTitle: auctionTitle ?? this.auctionTitle,
      overviewDescription: overviewDescription ?? this.overviewDescription,
    );
  }
}
