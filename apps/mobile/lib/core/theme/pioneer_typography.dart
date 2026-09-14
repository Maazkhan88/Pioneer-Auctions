import 'package:flutter/material.dart';
import 'pioneer_colors.dart';

abstract class PioneerTypography {
  static const TextStyle displayTitle = TextStyle(
    fontSize: 26.0,
    fontWeight: FontWeight.w800,
    height: 1.2,
    letterSpacing: -0.5,
    color: PioneerColors.textPrimary,
  );

  static const TextStyle pageTitle = TextStyle(
    fontSize: 20.0,
    fontWeight: FontWeight.w700,
    height: 1.25,
    letterSpacing: -0.2,
    color: PioneerColors.textPrimary,
  );

  static const TextStyle sectionTitle = TextStyle(
    fontSize: 17.0,
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: -0.1,
    color: PioneerColors.textPrimary,
  );

  static const TextStyle cardTitle = TextStyle(
    fontSize: 14.0,
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: 0.0,
    color: PioneerColors.textPrimary,
  );

  static const TextStyle priceLarge = TextStyle(
    fontSize: 22.0,
    fontWeight: FontWeight.w800,
    height: 1.15,
    letterSpacing: -0.2,
    color: PioneerColors.brandPurple,
  );

  static const TextStyle priceMedium = TextStyle(
    fontSize: 16.0,
    fontWeight: FontWeight.w800,
    height: 1.2,
    letterSpacing: 0.0,
    color: PioneerColors.textPrimary,
  );

  static const TextStyle priceLabel = TextStyle(
    fontSize: 11.0,
    fontWeight: FontWeight.w500,
    height: 1.2,
    letterSpacing: 0.0,
    color: PioneerColors.textMuted,
  );

  static const TextStyle countdownLarge = TextStyle(
    fontSize: 18.0,
    fontWeight: FontWeight.w800,
    height: 1.15,
    letterSpacing: 0.0,
    color: PioneerColors.liveRed,
  );

  static const TextStyle countdownCard = TextStyle(
    fontSize: 11.0,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: 0.0,
    color: PioneerColors.liveRed,
  );

  static const TextStyle metadata = TextStyle(
    fontSize: 11.0,
    fontWeight: FontWeight.w500,
    height: 1.3,
    letterSpacing: 0.0,
    color: PioneerColors.textMuted,
  );

  static const TextStyle body = TextStyle(
    fontSize: 13.0,
    fontWeight: FontWeight.w400,
    height: 1.4,
    letterSpacing: 0.0,
    color: PioneerColors.textSecondary,
  );

  static const TextStyle bodyBold = TextStyle(
    fontSize: 13.0,
    fontWeight: FontWeight.w700,
    height: 1.4,
    letterSpacing: 0.0,
    color: PioneerColors.textPrimary,
  );

  static const TextStyle buttonLabel = TextStyle(
    fontSize: 14.0,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: 0.1,
    color: PioneerColors.textOnPrimary,
  );

  static const TextStyle chipLabel = TextStyle(
    fontSize: 12.0,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.0,
    color: PioneerColors.textSecondary,
  );

  static const TextStyle navLabel = TextStyle(
    fontSize: 10.5,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.0,
    color: PioneerColors.navInactive,
  );

  static const TextStyle badgeText = TextStyle(
    fontSize: 10.0,
    fontWeight: FontWeight.w800,
    height: 1.1,
    letterSpacing: 0.3,
  );
}
