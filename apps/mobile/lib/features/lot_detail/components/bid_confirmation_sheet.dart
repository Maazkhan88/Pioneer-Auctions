import 'package:flutter/material.dart';
import '../../../core/bidding/bid_state_machine.dart';
import '../../../core/constants/pioneer_spacing.dart';
import '../../../core/localization/pioneer_localizations.dart';
import '../../../core/session/session_service.dart';
import '../../../core/theme/pioneer_colors.dart';
import '../../../core/theme/pioneer_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../design_system/components/pioneer_button.dart';

/// Modal bottom sheet displaying authoritative fee breakdown, terms acceptance gate,
/// and live submission states.
class BidConfirmationSheet extends StatefulWidget {
  final String lotTitle;
  final int bidAmountFils;
  final String termsVersionId;
  final BidStateMachine stateMachine;
  final Future<void> Function() onSubmit;

  const BidConfirmationSheet({
    super.key,
    required this.lotTitle,
    required this.bidAmountFils,
    this.termsVersionId = '',
    required this.stateMachine,
    required this.onSubmit,
  });

  static Future<void> show({
    required BuildContext context,
    required String lotTitle,
    required int bidAmountFils,
    String termsVersionId = '',
    required BidStateMachine stateMachine,
    required Future<void> Function() onSubmit,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => BidConfirmationSheet(
        lotTitle: lotTitle,
        bidAmountFils: bidAmountFils,
        termsVersionId: termsVersionId,
        stateMachine: stateMachine,
        onSubmit: onSubmit,
      ),
    );
  }

  @override
  State<BidConfirmationSheet> createState() => _BidConfirmationSheetState();
}

class _BidConfirmationSheetState extends State<BidConfirmationSheet> {
  late bool _termsAccepted;

  String get effectiveTermsVersionId => widget.termsVersionId.isNotEmpty
      ? widget.termsVersionId
      : SessionService.instance.termsVersionId;

  @override
  void initState() {
    super.initState();
    _termsAccepted = SessionService.instance.hasAcceptedTerms(effectiveTermsVersionId);
    widget.stateMachine.setTermsAccepted(_termsAccepted);
    widget.stateMachine.addListener(_onStateChanged);
  }

  @override
  void didUpdateWidget(BidConfirmationSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    final oldVersion = oldWidget.termsVersionId.isNotEmpty
        ? oldWidget.termsVersionId
        : SessionService.instance.termsVersionId;
    if (oldVersion != effectiveTermsVersionId) {
      setState(() {
        _termsAccepted = SessionService.instance.hasAcceptedTerms(effectiveTermsVersionId);
        widget.stateMachine.setTermsAccepted(_termsAccepted);
      });
    }
  }

  @override
  void dispose() {
    widget.stateMachine.removeListener(_onStateChanged);
    super.dispose();
  }

  void _onStateChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final breakdown = FeeBreakdown.calculate(widget.bidAmountFils);
    final state = widget.stateMachine.state;

    return Container(
      decoration: const BoxDecoration(
        color: PioneerColors.cardBackgroundLight,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: PioneerSpacing.screenPadding,
        right: PioneerSpacing.screenPadding,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: PioneerColors.borderCard,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Text(
            l10n.placeBid,
            style: PioneerTypography.sectionTitle.copyWith(
              color: PioneerColors.brandPurpleDeep,
              fontSize: 20,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            widget.lotTitle,
            style: PioneerTypography.metadata.copyWith(
              color: PioneerColors.textSecondary,
              fontSize: 13,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),

          // Fee Breakdown Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: PioneerColors.inputFillLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: PioneerColors.borderCard),
            ),
            child: Column(
              children: [
                _buildFeeRow(
                  label: l10n.currentBid,
                  amountAed: breakdown.hammerPriceAed,
                  isBold: false,
                ),
                const SizedBox(height: 8),
                _buildFeeRow(
                  label: l10n.buyersPremium,
                  amountAed: breakdown.buyerPremiumAed,
                  isBold: false,
                ),
                const SizedBox(height: 8),
                _buildFeeRow(
                  label: l10n.vat,
                  amountAed: breakdown.vatAed,
                  isBold: false,
                ),
                const Divider(height: 20, color: PioneerColors.borderCard),
                _buildFeeRow(
                  label: l10n.totalAmount,
                  amountAed: breakdown.totalAed,
                  isBold: true,
                  valueColor: PioneerColors.brandPurpleDeep,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Terms Acceptance Gate Checkbox
          CheckboxListTile(
            value: _termsAccepted,
            onChanged: state is BidSubmitting
                ? null
                : (val) {
                    final accepted = val ?? false;
                    setState(() {
                      _termsAccepted = accepted;
                      if (accepted) {
                        SessionService.instance.acceptTerms(effectiveTermsVersionId);
                      } else {
                        SessionService.instance.revokeTerms(effectiveTermsVersionId);
                      }
                      widget.stateMachine.setTermsAccepted(_termsAccepted);
                    });
                  },
            title: Text(
              l10n.acceptTerms,
              style: PioneerTypography.metadata.copyWith(
                color: PioneerColors.textPrimary,
                fontSize: 12,
              ),
            ),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
            dense: true,
            activeColor: PioneerColors.brandPurpleDeep,
          ),
          const SizedBox(height: 16),

          // State Status Alert (if error, gate, or unknown)
          if (state is BidRejected) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PioneerColors.statusExpiredBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                state.message,
                style: PioneerTypography.metadata.copyWith(
                  color: PioneerColors.statusExpiredText,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 12),
          ] else if (state is BidGated) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PioneerColors.statusPendingBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                state.message,
                style: PioneerTypography.metadata.copyWith(
                  color: PioneerColors.statusPendingText,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 12),
          ] else if (state is BidUnknown) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PioneerColors.statusPendingBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${l10n.awaitingConfirmation}\n${state.message}',
                style: PioneerTypography.metadata.copyWith(
                  color: PioneerColors.statusPendingText,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 12),
          ] else if (state is BidAccepted) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PioneerColors.statusWonBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                l10n.bidAcceptedTitle,
                style: PioneerTypography.metadata.copyWith(
                  color: PioneerColors.statusWonText,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Action CTA Button
          PioneerButton(
            label: state is BidSubmitting
                ? l10n.slideSubmitting
                : state is BidUnknown
                    ? l10n.retryBid
                    : state is BidAccepted
                        ? 'Done'
                        : '${l10n.placeBid} (${PioneerFormatters.currency(breakdown.hammerPriceAed)})',
            isLoading: state is BidSubmitting,
            onPressed: !_termsAccepted || state is BidSubmitting
                ? null
                : state is BidAccepted
                    ? () => Navigator.of(context).pop()
                    : () async {
                        await widget.onSubmit();
                      },
          ),
        ],
      ),
    );
  }

  Widget _buildFeeRow({
    required String label,
    required int amountAed,
    required bool isBold,
    Color? valueColor,
  }) {
    final formatted = PioneerFormatters.currency(amountAed);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: isBold
              ? PioneerTypography.cardTitle.copyWith(fontSize: 14)
              : PioneerTypography.metadata.copyWith(
                  color: PioneerColors.textSecondary,
                  fontSize: 13,
                ),
        ),
        Text(
          formatted,
          style: isBold
              ? PioneerTypography.cardTitle.copyWith(
                  color: valueColor ?? PioneerColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                )
              : PioneerTypography.metadata.copyWith(
                  color: PioneerColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
        ),
      ],
    );
  }
}
