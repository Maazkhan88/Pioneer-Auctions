class UserModel {
  final String id;
  final String fullName;
  final String initials;
  final String email;
  final String memberSince;
  final bool isVerified;
  final int activeBidsCount;
  final int registeredAuctionsCount;
  final int watchlistCount;
  final int wonLotsCount;
  final int paymentsDueAmount;

  const UserModel({
    required this.id,
    required this.fullName,
    required this.initials,
    required this.email,
    required this.memberSince,
    required this.isVerified,
    required this.activeBidsCount,
    required this.registeredAuctionsCount,
    required this.watchlistCount,
    required this.wonLotsCount,
    required this.paymentsDueAmount,
  });
}

class UserActivityItem {
  final String id;
  final String title;
  final String description;
  final String timestamp;
  final String badgeText;
  final String type; // 'bid', 'won', 'payment', 'registered'

  const UserActivityItem({
    required this.id,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.badgeText,
    required this.type,
  });
}
