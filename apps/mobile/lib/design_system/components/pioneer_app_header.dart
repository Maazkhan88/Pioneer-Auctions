import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

class PioneerAppHeader extends StatelessWidget implements PreferredSizeWidget {
  final bool isRoot;
  final String? title;
  final String? subtitle;
  final VoidCallback? onBack;
  final List<Widget>? actions;
  final bool showLogoInCenter;
  final bool showLogoOnLeft;

  const PioneerAppHeader({
    super.key,
    this.isRoot = true,
    this.title,
    this.subtitle,
    this.onBack,
    this.actions,
    this.showLogoInCenter = false,
    this.showLogoOnLeft = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(PioneerSpacing.headerHeight);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: PioneerColors.surface,
      child: SafeArea(
        bottom: false,
        child: Container(
          height: PioneerSpacing.headerHeight,
          padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: PioneerColors.borderLight, width: 1.0),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (isRoot) ...[
                // Pioneer Brand Logo
                if (showLogoOnLeft)
                  Image.asset(
                    AssetPaths.logo,
                    height: 34,
                    fit: BoxFit.contain,
                  ),
                const Spacer(),
                // Notification Bell with Badge '3'
                _buildNotificationBell(context),
                const SizedBox(width: 12),
                // Avatar 'AA'
                _buildAvatar(context),
              ] else ...[
                // Back Button
                GestureDetector(
                  onTap: onBack ?? () => Navigator.of(context).maybePop(),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: PioneerColors.surfaceSubtle,
                      shape: BoxShape.circle,
                      border: Border.all(color: PioneerColors.border, width: 1.0),
                    ),
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      size: 20,
                      color: PioneerColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                if (showLogoInCenter) ...[
                  Image.asset(
                    AssetPaths.logo,
                    height: 30,
                    fit: BoxFit.contain,
                  ),
                  const Spacer(),
                ] else if (title != null) ...[
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: PioneerTypography.pageTitle.copyWith(fontSize: 17),
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 1),
                          Text(
                            subtitle!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: PioneerTypography.metadata.copyWith(
                              color: PioneerColors.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ] else ...[
                  const Spacer(),
                ],
                if (actions != null) ...actions!
                else ...[
                  _buildNotificationBell(context),
                  const SizedBox(width: 12),
                  _buildAvatar(context),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationBell(BuildContext context) {
    return GestureDetector(
      key: const ValueKey('header_notification_bell'),
      onTap: () => context.push('/notifications'),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: PioneerColors.surfaceSubtle,
              shape: BoxShape.circle,
              border: Border.all(color: PioneerColors.borderLight, width: 1.0),
            ),
            child: const Icon(
              Icons.notifications_none_rounded,
              size: 20,
              color: PioneerColors.textPrimary,
            ),
          ),
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: PioneerColors.bellBadgeRed,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: const Center(
                child: Text(
                  '3',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    height: 1.0,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(BuildContext context) {
    return GestureDetector(
      key: const ValueKey('header_avatar'),
      onTap: () => context.push('/account'),
      child: Container(
        width: 34,
        height: 34,
        decoration: const BoxDecoration(
          color: PioneerColors.avatarBg,
          shape: BoxShape.circle,
        ),
        child: const Center(
          child: Text(
            'AA',
            style: TextStyle(
              color: PioneerColors.avatarText,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
