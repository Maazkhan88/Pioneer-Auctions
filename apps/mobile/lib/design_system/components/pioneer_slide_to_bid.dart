import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';

class PioneerSlideToBid extends StatefulWidget {
  final int bidAmount;
  final Future<void> Function()? onConfirmed;
  final bool enabled;

  const PioneerSlideToBid({
    super.key,
    required this.bidAmount,
    this.onConfirmed,
    this.enabled = true,
  });

  @override
  State<PioneerSlideToBid> createState() => _PioneerSlideToBidState();
}

class _PioneerSlideToBidState extends State<PioneerSlideToBid> with SingleTickerProviderStateMixin {
  double _dragPosition = 0.0;
  bool _isSubmitting = false;
  bool _isCompleted = false;

  late AnimationController _resetController;
  late Animation<double> _resetAnimation;

  Timer? _resetTimer;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
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
    _resetTimer?.cancel();
    _resetController.dispose();
    super.dispose();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details, double maxDrag) {
    if (!widget.enabled || _isSubmitting || _isCompleted) return;

    setState(() {
      _dragPosition = (_dragPosition + details.delta.dx).clamp(0.0, maxDrag);
    });
  }

  void _onHorizontalDragEnd(DragEndDetails details, double maxDrag) async {
    if (!widget.enabled || _isSubmitting || _isCompleted) return;

    if (_dragPosition >= maxDrag * 0.85) {
      // Confirmed!
      HapticFeedback.heavyImpact();
      setState(() {
        _dragPosition = maxDrag;
        _isSubmitting = true;
      });

      if (widget.onConfirmed != null) {
        await widget.onConfirmed!();
      }

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _isCompleted = true;
        });
        // Reset after 1.5 seconds so user can bid again
        _resetTimer?.cancel();
        _resetTimer = Timer(const Duration(milliseconds: 1500), () {
          if (mounted) {
            _animateReset();
          }
        });
      }
    } else {
      // Snap back
      _animateReset();
    }
  }

  void _animateReset() {
    _resetAnimation = Tween<double>(begin: _dragPosition, end: 0.0).animate(
      CurvedAnimation(parent: _resetController, curve: Curves.easeOutCubic),
    );
    _resetController.forward(from: 0.0).then((_) {
      if (mounted) {
        setState(() {
          _isCompleted = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
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
                color: _isCompleted
                    ? PioneerColors.registeredGreen
                    : PioneerColors.brandPurpleDeep,
                borderRadius: BorderRadius.circular(999),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x333D1088),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  // Center Text Prompt
                  Positioned.fill(
                    child: Center(
                      child: Opacity(
                        opacity: (1.0 - (progress * 1.5)).clamp(0.0, 1.0),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 56.0),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              _isCompleted
                                  ? 'BID CONFIRMED!'
                                  : 'Slide to place bid of ${PioneerFormatters.currency(widget.bidAmount)}',
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
                  // Draggable Circular Knob
                  Positioned(
                    left: trackPadding + _dragPosition,
                    child: GestureDetector(
                      onHorizontalDragUpdate: (details) => _onHorizontalDragUpdate(details, maxDrag),
                      onHorizontalDragEnd: (details) => _onHorizontalDragEnd(details, maxDrag),
                      child: Container(
                        width: knobSize,
                        height: knobSize,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x33000000),
                              blurRadius: 6,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: _isSubmitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(PioneerColors.brandPurpleDeep),
                                  ),
                                )
                              : _isCompleted
                                  ? const Icon(
                                      Icons.check_rounded,
                                      color: PioneerColors.registeredGreen,
                                      size: 26,
                                    )
                                  : const Icon(
                                      Icons.keyboard_double_arrow_right_rounded,
                                      color: PioneerColors.brandPurpleDeep,
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
        Text(
          'Slide right to confirm your bid. This helps prevent accidental bidding.',
          style: PioneerTypography.metadata.copyWith(
            color: PioneerColors.textMuted,
            fontSize: 11,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
