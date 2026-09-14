import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/localization/pioneer_localizations.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';

/// Interactive Slide-to-Bid control adhering to authoritative bidding criteria.
///
/// CRITICAL INVARIANTS:
/// 1. Drag completion represents ONLY an intent to submit -- it NEVER displays
///    optimistic success ("BID CONFIRMED!") or fires success haptics.
/// 2. Haptics:
///    - `HapticFeedback.selectionClick()` on reaching the drag threshold.
///    - Authoritative haptics (`heavyImpact` / `vibrate`) are driven ONLY by
///      authoritative server state changes in the BidStateMachine.
/// 3. Fully supports RTL: slides left-to-right in LTR and right-to-left in RTL.
/// 4. Provides accessible "Tap to Bid" alternative and proper screen reader semantics.
class PioneerSlideToBid extends StatefulWidget {
  final int bidAmount;
  final Future<void> Function()? onConfirmed;
  final bool enabled;
  final bool isSubmitting;
  final bool showTapAlternative;

  const PioneerSlideToBid({
    super.key,
    required this.bidAmount,
    this.onConfirmed,
    this.enabled = true,
    this.isSubmitting = false,
    this.showTapAlternative = true,
  });

  @override
  State<PioneerSlideToBid> createState() => _PioneerSlideToBidState();
}

class _PioneerSlideToBidState extends State<PioneerSlideToBid>
    with SingleTickerProviderStateMixin {
  double _dragPosition = 0.0;
  bool _thresholdReached = false;

  late AnimationController _resetController;
  late Animation<double> _resetAnimation;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    _resetAnimation = Tween<double>(begin: 0, end: 0).animate(
      CurvedAnimation(parent: _resetController, curve: Curves.easeOutCubic),
    )..addListener(() {
        setState(() {
          _dragPosition = _resetAnimation.value;
        });
      });
  }

  @override
  void dispose() {
    _resetController.dispose();
    super.dispose();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details, double maxDrag, bool isRtl) {
    if (!widget.enabled || widget.isSubmitting) return;

    // In RTL, dragging towards the left (negative dx) advances progress
    final double delta = isRtl ? -details.delta.dx : details.delta.dx;

    setState(() {
      _dragPosition = (_dragPosition + delta).clamp(0.0, maxDrag);
    });

    final bool reached = _dragPosition >= maxDrag * 0.85;
    if (reached && !_thresholdReached) {
      _thresholdReached = true;
      HapticFeedback.selectionClick();
    } else if (!reached && _thresholdReached) {
      _thresholdReached = false;
    }
  }

  void _onHorizontalDragEnd(DragEndDetails details, double maxDrag) async {
    if (!widget.enabled || widget.isSubmitting) return;

    if (_dragPosition >= maxDrag * 0.85) {
      // Threshold reached: trigger submit request and snap knob back smoothly
      _animateReset();
      if (widget.onConfirmed != null) {
        await widget.onConfirmed!();
      }
    } else {
      _animateReset();
    }
  }

  void _animateReset() {
    _thresholdReached = false;
    _resetAnimation = Tween<double>(begin: _dragPosition, end: 0.0).animate(
      CurvedAnimation(parent: _resetController, curve: Curves.easeOutCubic),
    );
    _resetController.forward(from: 0.0);
  }

  void _handleTapToBid() async {
    if (!widget.enabled || widget.isSubmitting) return;
    HapticFeedback.selectionClick();
    if (widget.onConfirmed != null) {
      await widget.onConfirmed!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isRtl = Directionality.of(context) == TextDirection.rtl;
    final reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final formattedAmount = PioneerFormatters.currency(widget.bidAmount);

    return Semantics(
      button: true,
      enabled: widget.enabled && !widget.isSubmitting,
      label: '${l10n.slideToBid} $formattedAmount',
      onTap: widget.enabled && !widget.isSubmitting ? _handleTapToBid : null,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final double trackWidth = constraints.maxWidth;
              const double knobSize = 50.0;
              const double trackPadding = 4.0;
              final double maxDrag = trackWidth - knobSize - (trackPadding * 2);
              final double progress = maxDrag > 0 ? (_dragPosition / maxDrag).clamp(0.0, 1.0) : 0.0;

              return Container(
                height: PioneerSpacing.slideTrackHeight,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: widget.enabled
                      ? PioneerColors.brandPurpleDeep
                      : PioneerColors.borderCard,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: widget.enabled
                      ? const [
                          BoxShadow(
                            color: Color(0x333D1088),
                            blurRadius: 10,
                            offset: Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Center Text Prompt
                    Positioned.fill(
                      child: Center(
                        child: Opacity(
                          opacity: widget.isSubmitting
                              ? 0.3
                              : (1.0 - (progress * 1.4)).clamp(0.0, 1.0),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 56.0),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                widget.isSubmitting
                                    ? l10n.slideSubmitting
                                    : '${l10n.slideToBid} \u202A$formattedAmount\u202C',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.2,
                                ),
                                maxLines: 1,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Draggable Circular Knob using Directional positioning
                    PositionedDirectional(
                      start: trackPadding + _dragPosition,
                      child: GestureDetector(
                        onHorizontalDragUpdate: (details) =>
                            _onHorizontalDragUpdate(details, maxDrag, isRtl),
                        onHorizontalDragEnd: (details) =>
                            _onHorizontalDragEnd(details, maxDrag),
                        child: Container(
                          width: knobSize,
                          height: knobSize,
                          decoration: BoxDecoration(
                            color: widget.enabled ? Colors.white : PioneerColors.cardBackgroundDark,
                            shape: BoxShape.circle,
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x33000000),
                                blurRadius: 6,
                                offset: Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Center(
                            child: widget.isSubmitting
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        PioneerColors.brandPurpleDeep,
                                      ),
                                    ),
                                  )
                                : Icon(
                                    isRtl
                                        ? Icons.keyboard_double_arrow_left_rounded
                                        : Icons.keyboard_double_arrow_right_rounded,
                                    color: widget.enabled
                                        ? PioneerColors.brandPurpleDeep
                                        : PioneerColors.textMuted,
                                    size: 26,
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 7),
          // Caption note
          Text(
            l10n.slideRightToBid,
            style: PioneerTypography.metadata.copyWith(
              color: PioneerColors.textMuted,
              fontSize: 11,
            ),
            textAlign: TextAlign.center,
          ),
          // Accessible Tap-to-Bid alternative (critical for accessibility & reduced motion)
          if (widget.showTapAlternative || reduceMotion) ...[
            const SizedBox(height: 6),
            TextButton(
              onPressed: widget.enabled && !widget.isSubmitting ? _handleTapToBid : null,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                minimumSize: const Size(48, 36),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                '${l10n.tapToBid} (\u202A$formattedAmount\u202C)',
                style: PioneerTypography.buttonSmall.copyWith(
                  color: widget.enabled
                      ? PioneerColors.brandPurple
                      : PioneerColors.textMuted,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
