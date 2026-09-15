import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/pioneer_spacing.dart';
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
                    index: 0,
                    label: 'Home',
                    icon: Icons.home_outlined,
                    activeIcon: Icons.home_rounded,
                  ),
                  _buildNavItem(
                    index: 1,
                    label: 'Auctions',
                    icon: Icons.gavel_outlined,
                    activeIcon: Icons.gavel_rounded,
                  ),
                  _buildNavItem(
                    index: 2,
                    label: 'Watchlist',
                    icon: Icons.favorite_border_rounded,
                    activeIcon: Icons.favorite_rounded,
                  ),
                  _buildNavItem(
                    index: 3,
                    label: 'My Bids',
                    icon: Icons.receipt_long_outlined,
                    activeIcon: Icons.receipt_long_rounded,
                  ),
                  _buildNavItem(
                    index: 4,
                    label: 'Profile',
                    icon: Icons.person_outline_rounded,
                    activeIcon: Icons.person_rounded,
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
    required int index,
    required String label,
    required IconData icon,
    required IconData activeIcon,
  }) {
    final bool isSelected = currentIndex == index;
    const Color activeColor = PioneerColors.brandPurple;
    const Color inactiveColor = PioneerColors.navInactive;

    return Expanded(
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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              // M3 Expressive Pill Indicator behind the active icon
              AnimatedContainer(
                duration: const Duration(milliseconds: 240),
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
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                style: PioneerTypography.navLabel.copyWith(
                  color: isSelected ? activeColor : inactiveColor,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                  fontSize: 10.5,
                  letterSpacing: isSelected ? -0.1 : 0.0,
                ),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
