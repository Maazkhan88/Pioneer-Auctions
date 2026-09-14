import 'package:flutter/material.dart';

abstract class PioneerSpacing {
  // Page Margins & Gutters
  static const double pageMargin = 16.0;
  static const double screenPadding = pageMargin;
  static const double cardGutterH = 12.0;
  static const double cardGutterV = 14.0;
  static const double sectionSpacing = 22.0;

  // Component Heights
  static const double headerHeight = 52.0;
  static const double searchHeight = 44.0;
  static const double filterHeight = 36.0;
  static const double buttonPrimaryHeight = 42.0;
  static const double stickyCtaHeight = 52.0;
  static const double slideTrackHeight = 58.0;
  static const double bottomNavHeight = 58.0;

  // Corner Radii
  static const double radiusCard = 14.0;
  static const double radiusInput = 12.0;
  static const double radiusButton = 10.0;
  static const double radiusPill = 999.0;
  static const double radiusSmall = 8.0;

  static const BorderRadius borderRadiusCard = BorderRadius.all(Radius.circular(radiusCard));
  static const BorderRadius borderRadiusInput = BorderRadius.all(Radius.circular(radiusInput));
  static const BorderRadius borderRadiusButton = BorderRadius.all(Radius.circular(radiusButton));
  static const BorderRadius borderRadiusPill = BorderRadius.all(Radius.circular(radiusPill));
  static const BorderRadius borderRadiusSmall = BorderRadius.all(Radius.circular(radiusSmall));

  // Box Shadows
  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color(0x0A000000), // 4% black
      blurRadius: 8.0,
      offset: Offset(0, 2),
    ),
    BoxShadow(
      color: Color(0x05000000), // 2% black
      blurRadius: 2.0,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> bottomNavShadow = [
    BoxShadow(
      color: Color(0x0D000000), // 5% black
      blurRadius: 12.0,
      offset: Offset(0, -2),
    ),
  ];

  static const List<BoxShadow> elevatedButtonShadow = [
    BoxShadow(
      color: Color(0x285208B6), // 16% purple
      blurRadius: 10.0,
      offset: Offset(0, 4),
    ),
  ];
}
