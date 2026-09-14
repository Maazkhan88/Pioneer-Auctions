class BidItem {
  final String id;
  final String bidderNumber;
  final bool isCurrentUser;
  final int amount;
  final String timeAgo;
  final String? lotId;

  const BidItem({
    required this.id,
    required this.bidderNumber,
    required this.isCurrentUser,
    required this.amount,
    required this.timeAgo,
    this.lotId,
  });
}
