import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/localization/pioneer_localizations.dart';
import '../../core/models/user_model.dart';
import '../../core/session/session_service.dart';
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

    return ListenableBuilder(
      listenable: SessionService.instance,
      builder: (context, _) {
        final session = SessionService.instance;
        return Scaffold(
          backgroundColor: PioneerColors.background,
          appBar: const PioneerAppHeader(isRoot: true),
          body: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 12),
                // Profile Banner Card
                _buildProfileCard(user, session),
                const SizedBox(height: 16),

                // KYC Verification Alert Callout if unverified
                if (!session.isKycVerified) ...[
                  _buildKycActionCallout(context),
                  const SizedBox(height: 16),
                ],

                // Horizontal Metrics Strip (5 Cards)
                _buildMetricsStrip(context, user),
                const SizedBox(height: 20),

                // Navigation Menu List
                _buildNavigationMenu(context, session),
                const SizedBox(height: 22),

                // Recent Activity Section
                _buildRecentActivitySection(activities),
                const SizedBox(height: PioneerSpacing.floatingNavClearance),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileCard(UserModel user, SessionService session) {
    final isVerified = session.isKycVerified;
    final isPending = session.kycStatus == MobileKycStatus.pending;
    final paddle = session.verifiedIdentity?.bidderPaddleNumber ?? 'Bidder #2456';

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
                          session.verifiedIdentity?.fullNameEn ?? user.fullName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isVerified ? '$paddle • ${user.memberSince}' : user.memberSince,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 11.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isVerified
                                ? PioneerColors.winningBadgeBg
                                : isPending
                                    ? PioneerColors.statusPendingBg
                                    : PioneerColors.statusExpiredBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isVerified
                                    ? Icons.verified_rounded
                                    : isPending
                                        ? Icons.hourglass_top_rounded
                                        : Icons.warning_amber_rounded,
                                size: 12,
                                color: isVerified
                                    ? PioneerColors.winningBadgeText
                                    : isPending
                                        ? PioneerColors.statusPendingText
                                        : PioneerColors.statusExpiredText,
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  isVerified
                                      ? 'Verified Account'
                                      : isPending
                                          ? 'Verification Pending'
                                          : 'Identity Unverified',
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isVerified
                                        ? PioneerColors.winningBadgeText
                                        : isPending
                                            ? PioneerColors.statusPendingText
                                            : PioneerColors.statusExpiredText,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
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

  Widget _buildKycActionCallout(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: PioneerColors.statusPendingBg,
          borderRadius: PioneerSpacing.borderRadiusCard,
          border: Border.all(color: PioneerColors.orangeEndingSoon.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: PioneerColors.orangeEndingSoon.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.badge_rounded, color: PioneerColors.orangeEndingSoon, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Emirates ID Verification',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PioneerColors.brandPurpleDeep),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Verify your Emirates ID to unlock bidding eligibility and paddle registration.',
                    style: PioneerTypography.metadata.copyWith(fontSize: 11, color: PioneerColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: PioneerColors.brandPurple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                visualDensity: VisualDensity.compact,
              ),
              onPressed: () => context.push('/kyc/verify'),
              child: const Text('Verify', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
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
      {'label': 'Payments Due', 'value': PioneerFormatters.currency(user.paymentsDueAmount), 'route': '/account/deposits'},
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

  Widget _buildNavigationMenu(BuildContext context, SessionService session) {
    final isAr = PioneerLocaleController.instance.isArabic;
    final items = [
      {'icon': Icons.gavel_rounded, 'title': 'My Registered Auctions', 'badge': null, 'route': '/auctions'},
      {'icon': Icons.receipt_long_rounded, 'title': 'My Bids & Orders', 'badge': null, 'route': '/my-bids'},
      {'icon': Icons.emoji_events_rounded, 'title': 'Won Assets', 'badge': null, 'route': '/my-bids'},
      {'icon': Icons.credit_card_rounded, 'title': 'Payments & Invoices', 'badge': null, 'route': '/account/deposits'},
      {'icon': Icons.account_balance_wallet_outlined, 'title': 'Security Deposits', 'badge': 'Active', 'route': '/account/deposits'},
      {
        'icon': Icons.folder_open_rounded,
        'title': 'Documents & Emirates ID',
        'badge': session.isKycVerified ? 'Verified' : 'Action Required',
        'route': '/kyc/verify',
      },
      {'icon': Icons.language_rounded, 'title': 'Language / اللغة', 'badge': isAr ? 'العربية' : 'EN', 'action': 'toggle_language'},
      {'icon': Icons.notifications_none_rounded, 'title': 'Notification Center', 'badge': '3', 'route': '/notifications'},
      {'icon': Icons.tune_rounded, 'title': 'Notification Preferences', 'badge': null, 'route': '/account/notifications'},
      {'icon': Icons.lock_outline_rounded, 'title': 'Security & Privacy', 'badge': null, 'action': 'open_security_modal'},
      {'icon': Icons.headset_mic_outlined, 'title': 'Customer Support', 'badge': null, 'action': 'open_support_modal'},
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
                      decoration: BoxDecoration(
                        color: item['action'] == 'toggle_language' ? PioneerColors.brandPurple : PioneerColors.bellBadgeRed,
                        borderRadius: BorderRadius.circular(10),
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
                if (item['action'] == 'toggle_language') {
                  PioneerLocaleController.instance.toggleLocale();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        PioneerLocaleController.instance.isArabic
                            ? 'تم التبديل إلى اللغة العربية'
                            : 'Switched to English',
                      ),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                } else if (item['action'] == 'open_support_modal') {
                  _showCustomerSupportSheet(context);
                } else if (item['action'] == 'open_security_modal') {
                  _showSecurityPrivacySheet(context);
                } else if (item['route'] != null) {
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

  void _showCustomerSupportSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: PioneerColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: PioneerColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: PioneerColors.brandPurpleLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.headset_mic_rounded, color: PioneerColors.brandPurple, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Customer Support & Concierge', style: PioneerTypography.sectionTitle),
                        SizedBox(height: 2),
                        Text('Pioneer Auctions UAE • 24/7 Floor Desk', style: PioneerTypography.metadata),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: PioneerColors.textSecondary),
                    onPressed: () => Navigator.pop(sheetContext),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildSupportTile(
                context,
                icon: Icons.phone_in_talk_rounded,
                title: 'Toll-Free UAE',
                subtitle: '800-PIONEER (800-746-6337)',
                actionLabel: 'Copy',
                copyText: '8007466337',
              ),
              const SizedBox(height: 10),
              _buildSupportTile(
                context,
                icon: Icons.chat_bubble_outline_rounded,
                title: 'WhatsApp Concierge',
                subtitle: '+971 4 333 1234',
                actionLabel: 'Copy',
                copyText: '+97143331234',
              ),
              const SizedBox(height: 10),
              _buildSupportTile(
                context,
                icon: Icons.mail_outline_rounded,
                title: 'Support Email',
                subtitle: 'support@pioneerauctions.ae',
                actionLabel: 'Copy',
                copyText: 'support@pioneerauctions.ae',
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: PioneerColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: PioneerColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded, size: 16, color: PioneerColors.brandPurple),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Floor Support Hours: Mon – Sat, 8:00 AM – 8:00 PM GST\nAl Aweer Auto Market, Ras Al Khor, Dubai, UAE',
                        style: PioneerTypography.metadata.copyWith(fontSize: 11, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSupportTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required String actionLabel,
    required String copyText,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: PioneerColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: PioneerColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: PioneerColors.brandPurple),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, color: PioneerColors.textSecondary, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PioneerColors.textPrimary)),
              ],
            ),
          ),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: PioneerColors.brandPurple,
              visualDensity: VisualDensity.compact,
              side: const BorderSide(color: PioneerColors.brandPurpleLight),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            ),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: copyText));
              HapticFeedback.lightImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$title copied to clipboard'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            child: Text(actionLabel, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _showSecurityPrivacySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: PioneerColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: PioneerColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: PioneerColors.brandPurpleLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.shield_outlined, color: PioneerColors.brandPurple, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Security & Privacy', style: PioneerTypography.sectionTitle),
                        SizedBox(height: 2),
                        Text('UAE Regulatory Compliance & Data Safety', style: PioneerTypography.metadata),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: PioneerColors.textSecondary),
                    onPressed: () => Navigator.pop(sheetContext),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: PioneerColors.statusWonBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: PioneerColors.registeredGreen.withValues(alpha: 0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.verified_user_rounded, color: PioneerColors.registeredGreen, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Emirates ID Bank-Grade Encryption',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PioneerColors.statusWonText),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'All document scans and identity artifacts are encrypted with AES-256 at rest and transmitted using TLS 1.3 in compliance with UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection.',
                            style: PioneerTypography.metadata.copyWith(fontSize: 11, color: PioneerColors.textSecondary, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: PioneerColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: PioneerColors.border),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.fingerprint_rounded, size: 20, color: PioneerColors.brandPurple),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text('Biometric Authentication', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: PioneerColors.winningBadgeBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Text('Active', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: PioneerColors.winningBadgeText)),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      children: [
                        const Icon(Icons.lock_clock_rounded, size: 20, color: PioneerColors.brandPurple),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text('Session Auto-Timeout', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                        Text('15 Minutes', style: PioneerTypography.metadata.copyWith(fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: PioneerColors.brandPurple,
                  side: const BorderSide(color: PioneerColors.brandPurple),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  Navigator.pop(sheetContext);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Pioneer Terms of Service (v2026.1) is active on this session'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                child: const Text('View Terms of Service & Privacy Policy', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        );
      },
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
