import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/user_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_status_chip.dart';

class AccountDashboardScreen extends StatelessWidget {
  const AccountDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = PioneerMockRepository.instance;
    final user = repo.currentUser;
    final activities = repo.getUserActivities();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: const PioneerAppHeader(isRoot: true),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 12),
            // Profile Banner Card
            _buildProfileCard(user),
            const SizedBox(height: 16),

            // Horizontal Metrics Strip (5 Cards)
            _buildMetricsStrip(context, user),
            const SizedBox(height: 20),

            // Navigation Menu List
            _buildNavigationMenu(context),
            const SizedBox(height: 22),

            // Recent Activity Section
            _buildRecentActivitySection(activities),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard(UserModel user) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          borderRadius: PioneerSpacing.borderRadiusCard,
          boxShadow: PioneerSpacing.cardShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Positioned.fill(
              child: Image.asset(
                AssetPaths.accountHeaderBanner,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: PioneerColors.brandPurpleDeep,
                ),
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      PioneerColors.brandPurpleDeep.withValues(alpha: 0.92),
                      PioneerColors.brandPurple.withValues(alpha: 0.8),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: Center(
                      child: Text(
                        user.initials,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user.memberSince,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 11.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: PioneerColors.winningBadgeBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified_rounded, size: 12, color: PioneerColors.winningBadgeText),
                              SizedBox(width: 4),
                              Text(
                                'Verified Account',
                                style: TextStyle(
                                  color: PioneerColors.winningBadgeText,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.edit_outlined, size: 16, color: Colors.white),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricsStrip(BuildContext context, UserModel user) {
    final metrics = [
      {'label': 'Active Bids', 'value': '${user.activeBidsCount}', 'route': '/my-bids'},
      {'label': 'Registered', 'value': '${user.registeredAuctionsCount}', 'route': '/auctions'},
      {'label': 'Watchlist', 'value': '${user.watchlistCount}', 'route': '/browse'},
      {'label': 'Won Lots', 'value': '${user.wonLotsCount}', 'route': '/my-bids'},
      {'label': 'Payments Due', 'value': PioneerFormatters.currency(user.paymentsDueAmount), 'route': null},
    ];

    return SizedBox(
      height: 84,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
        scrollDirection: Axis.horizontal,
        itemCount: metrics.length,
        separatorBuilder: (context, index) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final m = metrics[index];
          return GestureDetector(
            onTap: () {
              if (m['route'] != null) {
                context.push(m['route'] as String);
              }
            },
            child: Container(
              width: 112,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PioneerColors.surface,
                borderRadius: PioneerSpacing.borderRadiusCard,
                border: Border.all(color: PioneerColors.border),
                boxShadow: PioneerSpacing.cardShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    m['value'] as String,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: PioneerColors.brandPurple,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    m['label'] as String,
                    style: PioneerTypography.metadata.copyWith(fontSize: 10.5),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildNavigationMenu(BuildContext context) {
    final items = [
      {'icon': Icons.gavel_rounded, 'title': 'My Registered Auctions', 'badge': null, 'route': '/auctions'},
      {'icon': Icons.receipt_long_rounded, 'title': 'My Bids & Orders', 'badge': null, 'route': '/my-bids'},
      {'icon': Icons.emoji_events_rounded, 'title': 'Won Assets', 'badge': null, 'route': '/my-bids'},
      {'icon': Icons.credit_card_rounded, 'title': 'Payments & Invoices', 'badge': null, 'route': null},
      {'icon': Icons.account_balance_wallet_outlined, 'title': 'Security Deposits', 'badge': null, 'route': null},
      {'icon': Icons.folder_open_rounded, 'title': 'Documents & Emirates ID', 'badge': null, 'route': null},
      {'icon': Icons.notifications_none_rounded, 'title': 'Notification Center', 'badge': '3', 'route': null},
      {'icon': Icons.lock_outline_rounded, 'title': 'Security & Privacy', 'badge': null, 'route': null},
      {'icon': Icons.headset_mic_outlined, 'title': 'Customer Support', 'badge': null, 'route': null},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
      child: Material(
        color: PioneerColors.surface,
        borderRadius: PioneerSpacing.borderRadiusCard,
        clipBehavior: Clip.antiAlias,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: PioneerSpacing.borderRadiusCard,
            border: Border.all(color: PioneerColors.border),
            boxShadow: PioneerSpacing.cardShadow,
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
          itemCount: items.length,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
              dense: true,
              leading: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: PioneerColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  item['icon'] as IconData,
                  size: 17,
                  color: PioneerColors.brandPurple,
                ),
              ),
              title: Text(
                item['title'] as String,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: PioneerColors.textPrimary,
                ),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (item['badge'] != null)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: const BoxDecoration(
                        color: PioneerColors.bellBadgeRed,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        item['badge'] as String,
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                      ),
                    ),
                  const Icon(Icons.arrow_forward_ios_rounded, size: 13, color: PioneerColors.textMuted),
                ],
              ),
              onTap: () {
                if (item['route'] != null) {
                  context.push(item['route'] as String);
                }
              },
            );
          },
        ),
      ),
    ),
  );
}

  Widget _buildRecentActivitySection(List<UserActivityItem> activities) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Recent Activity', style: PioneerTypography.sectionTitle),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: PioneerColors.surface,
              borderRadius: PioneerSpacing.borderRadiusCard,
              border: Border.all(color: PioneerColors.border),
              boxShadow: PioneerSpacing.cardShadow,
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: activities.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final act = activities[index];
                return Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: PioneerColors.brandPurpleLight,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.history_rounded,
                          size: 18,
                          color: PioneerColors.brandPurple,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              act.title,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: PioneerColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              act.description,
                              style: PioneerTypography.metadata.copyWith(fontSize: 11),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              act.timestamp,
                              style: PioneerTypography.metadata.copyWith(fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                      PioneerStatusChip(
                        customLabel: act.badgeText,
                        isSmall: true,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
