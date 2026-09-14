import 'package:flutter/material.dart';
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
    return Container(
      decoration: const BoxDecoration(
        color: PioneerColors.surface,
        border: Border(
          top: BorderSide(color: PioneerColors.navBorder, width: 1.0),
        ),
        boxShadow: PioneerSpacing.bottomNavShadow,
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: PioneerSpacing.bottomNavHeight,
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
    );
  }

  Widget _buildNavItem({
    required int index,
    required String label,
    required IconData icon,
    required IconData activeIcon,
  }) {
    final bool isSelected = currentIndex == index;
    final Color color = isSelected ? PioneerColors.navActive : PioneerColors.navInactive;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onTap(index),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Top indicator bar for active tab
              Container(
                width: 36,
                height: 3,
                decoration: BoxDecoration(
                  color: isSelected ? PioneerColors.brandPurple : Colors.transparent,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Spacer(),
              Icon(
                isSelected ? activeIcon : icon,
                size: 22,
                color: color,
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: PioneerTypography.navLabel.copyWith(
                  color: color,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
            ],
          ),
        ),
      ),
    );
  }
}
