import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/localization/pioneer_localizations.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

enum NotificationFilter { all, bids, deposits, reminders }

class NotificationModel {
  final String id;
  final String type;
  final String titleEn;
  final String titleAr;
  final String bodyEn;
  final String bodyAr;
  final String? deepLink;
  final DateTime createdAt;
  bool isRead;

  NotificationModel({
    required this.id,
    required this.type,
    required this.titleEn,
    required this.titleAr,
    required this.bodyEn,
    required this.bodyAr,
    this.deepLink,
    required this.createdAt,
    this.isRead = false,
  });

  String title(bool isArabic) => isArabic ? titleAr : titleEn;
  String body(bool isArabic) => isArabic ? bodyAr : bodyEn;

  bool matchesFilter(NotificationFilter filter) {
    switch (filter) {
      case NotificationFilter.all:
        return true;
      case NotificationFilter.bids:
        return [
          'BID_CONFIRMED',
          'OUTBID',
          'PROXY_EXCEEDED',
          'WINNER_PENDING_APPROVAL',
          'BID_APPROVED',
          'BID_REJECTED',
        ].contains(type);
      case NotificationFilter.deposits:
        return [
          'DEPOSIT_CREDITED',
          'REFUND_PROCESSED',
          'REFUND_REJECTED',
        ].contains(type);
      case NotificationFilter.reminders:
        return ['ENDING_SOON', 'AUCTION_EXTENDED'].contains(type);
    }
  }
}

class NotificationCenterScreen extends StatefulWidget {
  final List<NotificationModel>? initialNotifications;

  const NotificationCenterScreen({
    super.key,
    this.initialNotifications,
  });

  @override
  State<NotificationCenterScreen> createState() => _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  NotificationFilter _activeFilter = NotificationFilter.all;
  late List<NotificationModel> _notifications;

  @override
  void initState() {
    super.initState();
    _notifications = widget.initialNotifications != null
        ? List.from(widget.initialNotifications!)
        : _buildDefaultNotifications();
  }

  List<NotificationModel> _buildDefaultNotifications() {
    final now = DateTime.now();
    return [
      NotificationModel(
        id: 'n-1',
        type: 'OUTBID',
        titleEn: "You've been outbid!",
        titleAr: 'تمت المزايدة عليك بسعر أعلى!',
        bodyEn: 'Someone placed a higher bid on Lot #101 (2024 Mercedes-Benz S 500). Tap to bid again.',
        bodyAr: 'قام مزايد آخر بتقديم عرض أعلى على اللوط رقم 101. اضغط للمزايدة من جديد.',
        deepLink: '/lot/101',
        createdAt: now.subtract(const Duration(minutes: 12)),
        isRead: false,
      ),
      NotificationModel(
        id: 'n-2',
        type: 'BID_CONFIRMED',
        titleEn: 'Bid Confirmed',
        titleAr: 'تم تأكيد المزايدة',
        bodyEn: 'Your bid of AED 52,000 on Lot #101 was placed successfully.',
        bodyAr: 'تم تقديم مزايدتك بقيمة 52,000 درهم على اللوط 101 بنجاح.',
        deepLink: '/lot/101',
        createdAt: now.subtract(const Duration(hours: 2)),
        isRead: false,
      ),
      NotificationModel(
        id: 'n-3',
        type: 'ENDING_SOON',
        titleEn: 'Auction Ending Soon',
        titleAr: 'المزاد ينتهي قريباً',
        bodyEn: 'Lot #204 (Luxury Villa, Palm Jumeirah) is ending in 30 minutes. Review your bids now.',
        bodyAr: 'اللوط رقم 204 ينتهي خلال 30 دقيقة. راجع مزايداتك الآن.',
        deepLink: '/lot/204',
        createdAt: now.subtract(const Duration(hours: 5)),
        isRead: false,
      ),
      NotificationModel(
        id: 'n-4',
        type: 'DEPOSIT_CREDITED',
        titleEn: 'Deposit Credited',
        titleAr: 'تم إيداع مبلغ التأمين',
        bodyEn: 'Your security deposit of AED 10,000 has been credited. Your bidding limit is updated.',
        bodyAr: 'تم إيداع مبلغ تأمينك بقيمة 10,000 درهم. تم تحديث حد المزايدة الخاص بك.',
        deepLink: '/account/deposits',
        createdAt: now.subtract(const Duration(days: 1, hours: 3)),
        isRead: true,
      ),
      NotificationModel(
        id: 'n-5',
        type: 'AUCTION_EXTENDED',
        titleEn: 'Auction Extended',
        titleAr: 'تم تمديد المزاد',
        bodyEn: 'Bidding on Lot #101 was extended by 2 minutes due to last-second bids (anti-sniping).',
        bodyAr: 'تم تمديد وقت المزايدة على اللوط 101 بدقيقتين لوجود مزايدات باللحظات الأخيرة.',
        deepLink: '/lot/101',
        createdAt: now.subtract(const Duration(days: 1, hours: 6)),
        isRead: true,
      ),
      NotificationModel(
        id: 'n-6',
        type: 'REFUND_PROCESSED',
        titleEn: 'Refund Processed',
        titleAr: 'تمت معالجة الاسترداد',
        bodyEn: 'Your refund of AED 5,000 has been sent to your bank card. Expected within 3-5 business days.',
        bodyAr: 'تمت معالجة استرداد مبلغ 5,000 درهم إلى بطاقتك البنكية.',
        deepLink: '/account/deposits',
        createdAt: now.subtract(const Duration(days: 4)),
        isRead: true,
      ),
    ];
  }

  void _markAsRead(NotificationModel notification) {
    if (!notification.isRead) {
      setState(() {
        notification.isRead = true;
      });
    }
    if (notification.deepLink != null && notification.deepLink!.isNotEmpty) {
      context.push(notification.deepLink!);
    }
  }

  void _markAllAsRead() {
    setState(() {
      for (final item in _notifications) {
        item.isRead = true;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.l10n.isArabic ? 'تم تحديد الكل كمقروء' : 'All notifications marked as read'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  int get _unreadCount => _notifications.where((n) => !n.isRead).length;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isAr = PioneerLocaleController.instance.isArabic;
    final filtered = _notifications.where((n) => n.matchesFilter(_activeFilter)).toList();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: AppBar(
        backgroundColor: PioneerColors.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 0,
        title: Text(
          l10n.notificationCenter,
          style: PioneerTypography.pageTitle.copyWith(fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: PioneerColors.textPrimary),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        actions: [
          IconButton(
            tooltip: l10n.notificationPreferences,
            icon: const Icon(Icons.tune_rounded, color: PioneerColors.textSecondary),
            onPressed: () => context.push('/account/notifications'),
          ),
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: Text(
                l10n.markAllAsRead,
                style: const TextStyle(
                  color: PioneerColors.brandPurple,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Column(
            children: [
              _buildFilterChips(l10n),
              const Divider(height: 1, color: PioneerColors.borderLight),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        color: PioneerColors.brandPurple,
        onRefresh: () async {
          await Future.delayed(const Duration(milliseconds: 400));
          setState(() {});
        },
        child: filtered.isEmpty
            ? _buildEmptyState(l10n)
            : _buildNotificationList(filtered, isAr),
      ),
    );
  }

  Widget _buildFilterChips(PioneerLocalizations l10n) {
    final chips = [
      {'filter': NotificationFilter.all, 'label': l10n.allNotifications},
      {'filter': NotificationFilter.bids, 'label': l10n.bidsFilter},
      {'filter': NotificationFilter.deposits, 'label': l10n.depositsFilter},
      {'filter': NotificationFilter.reminders, 'label': l10n.remindersFilter},
    ];

    return Container(
      height: 54,
      color: PioneerColors.surface,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = chips[index];
          final filter = item['filter'] as NotificationFilter;
          final label = item['label'] as String;
          final isSelected = _activeFilter == filter;

          return ChoiceChip(
            label: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? Colors.white : PioneerColors.textSecondary,
              ),
            ),
            selected: isSelected,
            selectedColor: PioneerColors.brandPurple,
            backgroundColor: PioneerColors.surfaceSubtle,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: isSelected ? PioneerColors.brandPurple : PioneerColors.borderLight,
              ),
            ),
            showCheckmark: false,
            onSelected: (selected) {
              if (selected) {
                setState(() {
                  _activeFilter = filter;
                });
              }
            },
          );
        },
      ),
    );
  }

  Widget _buildNotificationList(List<NotificationModel> list, bool isAr) {
    final todayItems = <NotificationModel>[];
    final yesterdayItems = <NotificationModel>[];
    final earlierItems = <NotificationModel>[];

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    for (final item in list) {
      final itemDate = DateTime(item.createdAt.year, item.createdAt.month, item.createdAt.day);
      if (itemDate.isAtSameMomentAs(today)) {
        todayItems.add(item);
      } else if (itemDate.isAtSameMomentAs(yesterday)) {
        yesterdayItems.add(item);
      } else {
        earlierItems.add(item);
      }
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        if (todayItems.isNotEmpty) ...[
          _buildDateHeader(context.l10n.today),
          ...todayItems.map((n) => _buildNotificationCard(n, isAr)),
          const SizedBox(height: 16),
        ],
        if (yesterdayItems.isNotEmpty) ...[
          _buildDateHeader(context.l10n.yesterday),
          ...yesterdayItems.map((n) => _buildNotificationCard(n, isAr)),
          const SizedBox(height: 16),
        ],
        if (earlierItems.isNotEmpty) ...[
          _buildDateHeader(context.l10n.earlier),
          ...earlierItems.map((n) => _buildNotificationCard(n, isAr)),
          const SizedBox(height: 16),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildDateHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: PioneerColors.textMuted,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel notification, bool isAr) {
    final style = _resolveNotificationStyle(notification.type);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: notification.isRead ? PioneerColors.surface : PioneerColors.surfaceHighlight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: notification.isRead ? PioneerColors.borderLight : PioneerColors.brandPurple.withValues(alpha: 0.25),
          width: notification.isRead ? 1 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            offset: const Offset(0, 2),
            blurRadius: 6,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _markAsRead(notification),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Leading Type Icon Container
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: style.bgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Icon(
                      style.icon,
                      color: style.iconColor,
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title(isAr),
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: notification.isRead ? FontWeight.w600 : FontWeight.w800,
                                color: PioneerColors.textPrimary,
                              ),
                            ),
                          ),
                          Text(
                            _formatTimestamp(notification.createdAt),
                            style: TextStyle(
                              fontSize: 11,
                              color: PioneerColors.textMuted,
                              fontWeight: notification.isRead ? FontWeight.w400 : FontWeight.w600,
                            ),
                          ),
                          if (!notification.isRead) ...[
                            const SizedBox(width: 6),
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: PioneerColors.brandPurple,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.body(isAr),
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          color: notification.isRead ? PioneerColors.textSecondary : PioneerColors.textPrimary,
                        ),
                      ),
                      if (notification.deepLink != null) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              isAr ? 'عرض التفاصيل' : 'View Details',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: PioneerColors.brandPurple,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 11,
                              color: PioneerColors.brandPurple,
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}';
  }

  _NotificationCardStyle _resolveNotificationStyle(String type) {
    switch (type) {
      case 'OUTBID':
      case 'PROXY_EXCEEDED':
      case 'BID_REJECTED':
      case 'REFUND_REJECTED':
        return const _NotificationCardStyle(
          icon: Icons.gavel_rounded,
          iconColor: PioneerColors.liveRed,
          bgColor: Color(0xFFFDE7EC),
        );
      case 'BID_CONFIRMED':
      case 'BID_APPROVED':
      case 'WINNER_PENDING_APPROVAL':
        return const _NotificationCardStyle(
          icon: Icons.check_circle_rounded,
          iconColor: Color(0xFF046E2E),
          bgColor: Color(0xFFE3FBEB),
        );
      case 'DEPOSIT_CREDITED':
      case 'REFUND_PROCESSED':
        return const _NotificationCardStyle(
          icon: Icons.account_balance_wallet_rounded,
          iconColor: PioneerColors.brandPurple,
          bgColor: PioneerColors.brandPurpleLight,
        );
      case 'ENDING_SOON':
      case 'AUCTION_EXTENDED':
      default:
        return const _NotificationCardStyle(
          icon: Icons.alarm_rounded,
          iconColor: PioneerColors.brandOrange,
          bgColor: PioneerColors.brandOrangeLight,
        );
    }
  }

  Widget _buildEmptyState(PioneerLocalizations l10n) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: const BoxDecoration(
                color: PioneerColors.surfaceSubtle,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(
                  Icons.notifications_off_outlined,
                  size: 44,
                  color: PioneerColors.textLight,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              l10n.noNotifications,
              style: PioneerTypography.sectionTitle.copyWith(fontSize: 18),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              l10n.noNotificationsSubtitle,
              style: const TextStyle(fontSize: 14, color: PioneerColors.textSecondary, height: 1.4),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationCardStyle {
  final IconData icon;
  final Color iconColor;
  final Color bgColor;

  const _NotificationCardStyle({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
  });
}
