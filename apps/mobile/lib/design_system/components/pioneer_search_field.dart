import 'package:flutter/material.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

class PioneerSearchField extends StatelessWidget {
  final String hintText;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onFilterTap;
  final bool showFilterButton;
  final bool readOnly;
  final VoidCallback? onTap;

  const PioneerSearchField({
    super.key,
    this.hintText = 'Search auctions, lots, categories...',
    this.controller,
    this.onChanged,
    this.onFilterTap,
    this.showFilterButton = true,
    this.readOnly = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: PioneerSpacing.searchHeight,
      decoration: BoxDecoration(
        color: PioneerColors.surfaceSubtle,
        borderRadius: PioneerSpacing.borderRadiusInput,
        border: Border.all(color: PioneerColors.border, width: 1.0),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(width: 12),
          const Icon(
            Icons.search_rounded,
            size: 20,
            color: PioneerColors.textMuted,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              readOnly: readOnly,
              onTap: onTap,
              onChanged: onChanged,
              style: PioneerTypography.body.copyWith(
                color: PioneerColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: hintText,
                hintStyle: PioneerTypography.body.copyWith(
                  color: PioneerColors.textMuted,
                  fontSize: 13,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          if (showFilterButton) ...[
            GestureDetector(
              onTap: onFilterTap,
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: PioneerColors.brandPurpleLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.tune_rounded,
                  size: 16,
                  color: PioneerColors.brandPurple,
                ),
              ),
            ),
          ] else ...[
            const SizedBox(width: 12),
          ],
        ],
      ),
    );
  }
}
