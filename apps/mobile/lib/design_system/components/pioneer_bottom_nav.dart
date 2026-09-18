import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/localization/pioneer_localizations.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

class PioneerBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const PioneerBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = PioneerLocalizations.of(context);
    final bool disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          PioneerSpacing.floatingNavMarginH,
          0,
          PioneerSpacing.floatingNavMarginH,
          PioneerSpacing.floatingNavMarginBottom,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(PioneerSpacing.radiusFloatingNav),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              height: PioneerSpacing.floatingNavHeight,
              decoration: BoxDecoration(
                color: PioneerColors.surface.withValues(alpha: 0.90),
                borderRadius: BorderRadius.circular(PioneerSpacing.radiusFloatingNav),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.8),
                  width: 1.2,
                ),
                boxShadow: PioneerSpacing.floatingNavShadow,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                children: [
                  _buildNavItem(
                    context: context,
                    index: 0,
                    label: l10n.navHome,
                    icon: Icons.home_outlined,
                    activeIcon: Icons.home_rounded,
                    disableAnimations: disableAnimations,
                  ),
                  _buildNavItem(
                    context: context,
                    index: 1,
                    label: l10n.navAuctions,
                    icon: Icons.gavel_outlined,
                    activeIcon: Icons.gavel_rounded,
                    disableAnimations: disableAnimations,
                  ),
                  _buildNavItem(
                    context: context,
                    index: 2,
                    label: l10n.navBrowse,
                    icon: Icons.grid_view_outlined,
                    activeIcon: Icons.grid_view_rounded,
                    disableAnimations: disableAnimations,
                  ),
                  _buildNavItem(
                    context: context,
                    index: 3,
                    label: l10n.navMyBids,
                    icon: Icons.receipt_long_outlined,
                    activeIcon: Icons.receipt_long_rounded,
                    disableAnimations: disableAnimations,
                  ),
                  _buildNavItem(
                    context: context,
                    index: 4,
                    label: l10n.navAccount,
                    icon: Icons.person_outline_rounded,
                    activeIcon: Icons.person_rounded,
                    disableAnimations: disableAnimations,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required BuildContext context,
    required int index,
    required String label,
    required IconData icon,
    required IconData activeIcon,
    required bool disableAnimations,
  }) {
    final bool isSelected = currentIndex == index;
    const Color activeColor = PioneerColors.brandPurple;
    const Color inactiveColor = PioneerColors.navInactive;

    final Duration animDuration = disableAnimations
        ? Duration.zero
        : const Duration(milliseconds: 240);
    final Duration textDuration = disableAnimations
        ? Duration.zero
        : const Duration(milliseconds: 200);

    return Expanded(
      child: Semantics(
        container: true,
        button: true,
        selected: isSelected,
        label: label,
        child: ExcludeSemantics(
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              splashColor: PioneerColors.brandPurple.withValues(alpha: 0.12),
              highlightColor: PioneerColors.brandPurple.withValues(alpha: 0.06),
              onTap: () {
                if (!isSelected) {
                  HapticFeedback.selectionClick();
                }
                onTap(index);
              },
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // M3 Expressive Pill Indicator behind the active icon
                  AnimatedContainer(
                    duration: animDuration,
                    curve: Curves.easeOutCubic,
                    width: isSelected ? 50 : 36,
                    height: 30,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? PioneerColors.brandPurple.withValues(alpha: 0.14)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Icon(
                        isSelected ? activeIcon : icon,
                        size: 22,
                        color: isSelected ? activeColor : inactiveColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  AnimatedDefaultTextStyle(
                    duration: textDuration,
                    curve: Curves.easeOutCubic,
                    style: PioneerTypography.navLabel.copyWith(
                      color: isSelected ? activeColor : inactiveColor,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                      fontSize: 10.5,
                      letterSpacing: isSelected ? -0.1 : 0.0,
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
}
