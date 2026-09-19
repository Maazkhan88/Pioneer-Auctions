import 'package:pioneer_contracts/pioneer_contracts.dart';

/// Models the public lot card payload returned by GET /api/v1/lots and GET /api/v1/lots/:lotId.
class PublicLotCard {
  final String lotId;
  final String auctionId;
  final String lotNumber;
  final String titleEn;
  final String titleAr;
  final String lifecycle;
  final Money currentBid;
  final Money nextMinimumBid;
  final String? category;
  final String reserveStatus;
  final DateTime closesAt;
  final int contractVersion;

  const PublicLotCard({
    required this.lotId,
    required this.auctionId,
    required this.lotNumber,
    required this.titleEn,
    required this.titleAr,
    required this.lifecycle,
    required this.currentBid,
    required this.nextMinimumBid,
    this.category,
    required this.reserveStatus,
    required this.closesAt,
    this.contractVersion = 1,
  });

  factory PublicLotCard.fromJson(Map<String, dynamic> json) {
    if (json['lotId'] == null && json['id'] != null) {
      json['lotId'] = json['id'];
    }

    final currentBidRaw = json['currentBid'];
    final nextBidRaw = json['nextMinimumBid'];

    return PublicLotCard(
      lotId: json['lotId'] as String? ?? '',
      auctionId: json['auctionId'] as String? ?? '',
      lotNumber: json['lotNumber']?.toString() ?? '',
      titleEn: json['titleEn'] as String? ?? json['title'] as String? ?? '',
      titleAr: json['titleAr'] as String? ?? '',
      lifecycle: json['lifecycle'] as String? ?? 'DRAFT',
      category: json['category'] as String?,
      currentBid: currentBidRaw is Map<String, dynamic>
          ? Money.fromJson(currentBidRaw)
          : Money(amountFils: (currentBidRaw is num ? (currentBidRaw * 100).round() : 0), currency: Currency.AED),
      nextMinimumBid: nextBidRaw is Map<String, dynamic>
          ? Money.fromJson(nextBidRaw)
          : Money(amountFils: (nextBidRaw is num ? (nextBidRaw * 100).round() : 0), currency: Currency.AED),
      reserveStatus: json['reserveStatus'] as String? ?? 'NOT_APPLICABLE',
      closesAt: json['closesAt'] != null ? DateTime.parse(json['closesAt'] as String) : DateTime.now().toUtc(),
      contractVersion: json['contractVersion'] as int? ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'lotId': lotId,
        'auctionId': auctionId,
        'lotNumber': lotNumber,
        'titleEn': titleEn,
        'titleAr': titleAr,
        'lifecycle': lifecycle,
        if (category != null) 'category': category,
        'currentBid': currentBid.toJson(),
        'nextMinimumBid': nextMinimumBid.toJson(),
        'reserveStatus': reserveStatus,
        'closesAt': closesAt.toIso8601String(),
        'contractVersion': contractVersion,
      };

  double get currentBidAed => currentBid.amountFils / 100.0;
  double get nextMinimumBidAed => nextMinimumBid.amountFils / 100.0;
  bool get isLive => lifecycle == 'LIVE';
  bool get isClosed => lifecycle == 'CLOSED' || lifecycle == 'CANCELLED';
  bool get isReserveMet => reserveStatus == 'MET';

  String localizedTitle(bool isArabic) {
    if (isArabic && titleAr.isNotEmpty) return titleAr;
    return titleEn;
  }
}

/// Models the list response for GET /api/v1/lots.
class PublicLotsResponse {
  final int contractVersion;
  final List<PublicLotCard> items;
  final int total;
  final int limit;
  final int offset;

  const PublicLotsResponse({
    this.contractVersion = 1,
    required this.items,
    this.total = 0,
    this.limit = 50,
    this.offset = 0,
  });

  factory PublicLotsResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final List<PublicLotCard> lotItems = [];

    if (rawItems is List) {
      for (final item in rawItems) {
        if (item is Map<String, dynamic>) {
          lotItems.add(PublicLotCard.fromJson(item));
        }
      }
    }

    return PublicLotsResponse(
      contractVersion: json['contractVersion'] as int? ?? 1,
      items: lotItems,
      total: json['total'] as int? ?? lotItems.length,
      limit: json['limit'] as int? ?? lotItems.length,
      offset: json['offset'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'contractVersion': contractVersion,
        'items': items.map((i) => i.toJson()).toList(),
        'total': total,
        'limit': limit,
        'offset': offset,
      };
}
