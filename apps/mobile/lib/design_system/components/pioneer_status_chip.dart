import 'package:flutter/material.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

class PioneerStatusChip extends StatelessWidget {
  final LotStatus? status;
  final String? customLabel;
  final Color? customBg;
  final Color? customTextColor;
  final IconData? customIcon;
  final bool isSmall;

  const PioneerStatusChip({
    super.key,
    this.status,
    this.customLabel,
    this.customBg,
    this.customTextColor,
    this.customIcon,
    this.isSmall = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;
    String label;
    IconData? icon;
    bool hasPulse = false;

    if (customLabel != null) {
      label = customLabel!;
      bg = customBg ?? PioneerColors.brandPurpleLight;
      textColor = customTextColor ?? PioneerColors.brandPurple;
      icon = customIcon;
    } else {
      switch (status ?? LotStatus.upcoming) {
        case LotStatus.live:
          label = 'LIVE';
          bg = PioneerColors.liveRed;
          textColor = Colors.white;
          hasPulse = true;
          break;
        case LotStatus.upcoming:
          label = 'UPCOMING';
          bg = PioneerColors.upcomingPurple;
          textColor = Colors.white;
          break;
        case LotStatus.registered:
          label = 'REGISTERED';
          bg = PioneerColors.registeredGreen;
          textColor = Colors.white;
          icon = Icons.check_circle_rounded;
          break;
        case LotStatus.endingSoon:
          label = 'ENDING SOON';
          bg = PioneerColors.endingSoonOrange;
          textColor = Colors.white;
          icon = Icons.local_fire_department_rounded;
          break;
        case LotStatus.winning:
          label = 'WINNING';
          bg = PioneerColors.winningBadgeBg;
          textColor = PioneerColors.winningBadgeText;
          icon = Icons.emoji_events_rounded;
          break;
        case LotStatus.outbid:
          label = 'OUTBID';
          bg = PioneerColors.outbidBadgeBg;
          textColor = PioneerColors.outbidBadgeText;
          icon = Icons.arrow_upward_rounded;
          break;
        case LotStatus.won:
          label = 'WON';
          bg = PioneerColors.wonBadgeBg;
          textColor = PioneerColors.wonBadgeText;
          icon = Icons.check_circle_outline_rounded;
          break;
        case LotStatus.lost:
          label = 'LOST';
          bg = PioneerColors.lostBadgeBg;
          textColor = PioneerColors.lostBadgeText;
          break;
      }
    }

    final double verticalPadding = isSmall ? 3.0 : 4.0;
    final double horizontalPadding = isSmall ? 7.0 : 9.0;
    final double fontSize = isSmall ? 9.5 : 10.5;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: verticalPadding),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (hasPulse) ...[
            Container(
              width: 6,
              height: 6,
              margin: const EdgeInsets.only(right: 5),
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
            ),
          ] else if (icon != null) ...[
            Icon(
              icon,
              size: isSmall ? 11 : 13,
              color: textColor,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: PioneerTypography.badgeText.copyWith(
              color: textColor,
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
