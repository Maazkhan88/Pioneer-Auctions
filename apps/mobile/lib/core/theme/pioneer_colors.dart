import 'package:flutter/material.dart';

/// Exact color tokens extracted directly from Pioneer Auctions reference screens.
abstract class PioneerColors {
  // Brand & Identity
  static const Color brandPurple = Color(0xFF5208B6);
  static const Color brandPurpleDeep = Color(0xFF3D1088);
  static const Color brandPurpleLight = Color(0xFFF2ECF9);
  static const Color brandOrange = Color(0xFFF77A10);
  static const Color brandOrangeLight = Color(0xFFFFF3EB);

  // Canvas & Surfaces
  static const Color background = Color(0xFFF8F9FD);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSubtle = Color(0xFFF6F6FC);
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color surfaceHighlight = Color(0xFFFAF9FD);

  // Outlines & Dividers
  static const Color border = Color(0xFFE5E7EB);
  static const Color borderLight = Color(0xFFEEF0F6);
  static const Color borderMedium = Color(0xFFD1D5DB);

  // Typography Ink
  static const Color textPrimary = Color(0xFF0C0D19);
  static const Color textSecondary = Color(0xFF4B5563);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color textLight = Color(0xFF9CA3AF);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // Badges & Status Indicators
  static const Color liveRed = Color(0xFFEE233E);
  static const Color upcomingPurple = Color(0xFF7433D9);
  static const Color registeredGreen = Color(0xFF19B449);
  static const Color endingSoonOrange = Color(0xFFFDC04E);
  static const Color pastGrey = Color(0xFFE5E7EB);

  // Bid States (Winning / Outbid / Won / Lost)
  static const Color winningBadgeBg = Color(0xFFE3FBEB);
  static const Color winningBadgeText = Color(0xFF046E2E);

  static const Color outbidBadgeBg = Color(0xFFFDE7EC);
  static const Color outbidBadgeText = Color(0xFFE5233D);

  static const Color wonBadgeBg = Color(0xFFE3FBEB);
  static const Color wonBadgeText = Color(0xFF046E2E);

  static const Color lostBadgeBg = Color(0xFFEFF0F5);
  static const Color lostBadgeText = Color(0xFF4B5563);

  // Navigation
  static const Color navInactive = Color(0xFF8F8FA1);
  static const Color navActive = Color(0xFF5208B6);
  static const Color navBorder = Color(0xFFE5E7EB);

  // Specific Elements
  static const Color avatarBg = Color(0xFF8C8FAE);
  static const Color avatarText = Color(0xFFFFFFFF);
  static const Color bellBadgeRed = Color(0xFFED253E);
  static const Color bannerGradientStart = Color(0xFF1C0632);
  static const Color bannerGradientEnd = Color(0xFF38105E);
}
