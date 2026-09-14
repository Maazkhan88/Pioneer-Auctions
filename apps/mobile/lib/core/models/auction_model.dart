import 'lot_model.dart';

enum AuctionStatus {
  live,
  upcoming,
  past,
}

class AuctionItem {
  final String id;
  final String title;
  final LotCategory category;
  final AuctionStatus status;
  final DateTime date;
  final String dateString;
  final String location;
  final int lotCount;
  final int currentLotNumber;
  final int watchingCount;
  final String imagePath;
  final bool isRegistered;
  final Duration? timeRemaining;

  const AuctionItem({
    required this.id,
    required this.title,
    required this.category,
    required this.status,
    required this.date,
    required this.dateString,
    required this.location,
    required this.lotCount,
    this.currentLotNumber = 1,
    this.watchingCount = 0,
    required this.imagePath,
    this.isRegistered = false,
    this.timeRemaining,
  });
}
