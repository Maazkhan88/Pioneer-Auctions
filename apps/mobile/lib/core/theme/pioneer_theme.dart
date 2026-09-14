import 'package:flutter/material.dart';
import 'pioneer_colors.dart';
import 'pioneer_typography.dart';
import '../constants/pioneer_spacing.dart';

abstract class PioneerTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: PioneerColors.background,
      canvasColor: PioneerColors.surface,
      primaryColor: PioneerColors.brandPurple,
      dividerColor: PioneerColors.borderLight,
      colorScheme: const ColorScheme.light(
        primary: PioneerColors.brandPurple,
        secondary: PioneerColors.brandOrange,
        surface: PioneerColors.surface,
        error: PioneerColors.liveRed,
        onPrimary: PioneerColors.textOnPrimary,
        onSurface: PioneerColors.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: PioneerColors.textPrimary),
        titleTextStyle: PioneerTypography.pageTitle,
      ),
      cardTheme: CardThemeData(
        color: PioneerColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: PioneerSpacing.borderRadiusCard,
          side: const BorderSide(color: PioneerColors.border, width: 1.0),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(
        color: PioneerColors.borderLight,
        thickness: 1.0,
        space: 1.0,
      ),
      splashFactory: InkRipple.splashFactory,
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: PioneerColors.darkBackground,
      canvasColor: PioneerColors.darkSurface,
      primaryColor: PioneerColors.brandPurple,
      dividerColor: PioneerColors.darkBorder,
      colorScheme: const ColorScheme.dark(
        primary: PioneerColors.brandPurple,
        secondary: PioneerColors.brandOrange,
        surface: PioneerColors.darkSurface,
        error: PioneerColors.liveRed,
        onPrimary: Colors.white,
        onSurface: PioneerColors.darkTextPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: PioneerColors.darkTextPrimary),
        titleTextStyle: PioneerTypography.pageTitle,
      ),
      cardTheme: CardThemeData(
        color: PioneerColors.darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: PioneerSpacing.borderRadiusCard,
          side: const BorderSide(color: PioneerColors.darkBorder, width: 1.0),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(
        color: PioneerColors.darkBorder,
        thickness: 1.0,
        space: 1.0,
      ),
      splashFactory: InkRipple.splashFactory,
    );
  }
}
