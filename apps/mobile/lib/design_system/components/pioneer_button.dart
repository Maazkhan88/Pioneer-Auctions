import 'package:flutter/material.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

enum PioneerButtonVariant {
  primary,
  secondary,
  outline,
  danger,
}

class PioneerButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final PioneerButtonVariant variant;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final bool isLarge;
  final bool isFullWidth;
  final double? width;
  final bool isLoading;

  const PioneerButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = PioneerButtonVariant.primary,
    this.leadingIcon,
    this.trailingIcon,
    this.isLarge = false,
    this.isFullWidth = true,
    this.width,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;
    Border? border;

    switch (variant) {
      case PioneerButtonVariant.primary:
        bg = onPressed == null ? PioneerColors.borderMedium : PioneerColors.brandPurple;
        textColor = Colors.white;
        break;
      case PioneerButtonVariant.secondary:
        bg = PioneerColors.brandPurpleLight;
        textColor = PioneerColors.brandPurple;
        break;
      case PioneerButtonVariant.outline:
        bg = Colors.transparent;
        textColor = PioneerColors.textPrimary;
        border = Border.all(color: PioneerColors.border, width: 1.0);
        break;
      case PioneerButtonVariant.danger:
        bg = PioneerColors.liveRed;
        textColor = Colors.white;
        break;
    }

    final double height = isLarge ? PioneerSpacing.stickyCtaHeight : PioneerSpacing.buttonPrimaryHeight;

    return SizedBox(
      width: isFullWidth ? double.infinity : width,
      height: height,
      child: Material(
        color: bg,
        borderRadius: PioneerSpacing.borderRadiusButton,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: PioneerSpacing.borderRadiusButton,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              border: border,
              borderRadius: PioneerSpacing.borderRadiusButton,
            ),
            child: Center(
              child: isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(textColor),
                      ),
                    )
                  : FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          if (leadingIcon != null) ...[
                            Icon(leadingIcon, size: 17, color: textColor),
                            const SizedBox(width: 8),
                          ],
                          Text(
                            label,
                            style: PioneerTypography.buttonLabel.copyWith(
                              color: textColor,
                              fontSize: isLarge ? 15.0 : 13.5,
                            ),
                          ),
                          if (trailingIcon != null) ...[
                            const SizedBox(width: 6),
                            Icon(trailingIcon, size: 16, color: textColor),
                          ],
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
