import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/localization/pioneer_localizations.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/utils/formatters.dart';

class DepositEntryItem {
  final String id;
  final int amountFils;
  final String direction; // 'CREDIT' or 'DEBIT'
  final String reasonCode;
  final DateTime createdAt;

  const DepositEntryItem({
    required this.id,
    required this.amountFils,
    required this.direction,
    required this.reasonCode,
    required this.createdAt,
  });
}

class DepositRefundItem {
  final String id;
  final int amountFils;
  final String status;
  final String? reason;
  final DateTime requestedAt;

  const DepositRefundItem({
    required this.id,
    required this.amountFils,
    required this.status,
    this.reason,
    required this.requestedAt,
  });
}

class DepositDashboardScreen extends StatefulWidget {
  final int initialAvailableFils;

  const DepositDashboardScreen({
    super.key,
    this.initialAvailableFils = 1000000, // 10,000 AED default
  });

  @override
  State<DepositDashboardScreen> createState() => _DepositDashboardScreenState();
}

class _DepositDashboardScreenState extends State<DepositDashboardScreen> {
  late int _availableFils;
  late int _totalDepositedFils;
  final int _heldFils = 0;

  final List<DepositEntryItem> _entries = [];
  final List<DepositRefundItem> _refundRequests = [];

  @override
  void initState() {
    super.initState();
    _availableFils = widget.initialAvailableFils;
    _totalDepositedFils = widget.initialAvailableFils;

    if (_availableFils > 0) {
      _entries.add(
        DepositEntryItem(
          id: 'dl_init',
          amountFils: _availableFils,
          direction: 'CREDIT',
          reasonCode: 'DEPOSIT_CLEARED',
          createdAt: DateTime.now().subtract(const Duration(days: 3)),
        ),
      );
    }
  }

  void _showTopUpSheet(BuildContext context, PioneerLocalizations l10n) {
    int selectedAmountFils = 500000; // 5,000 AED
    final customController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: PioneerColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.addDeposit,
                        style: const TextStyle(
                          color: PioneerColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: PioneerColors.textSecondary),
                        onPressed: () => Navigator.pop(sheetContext),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    children: [500000, 1000000, 2500000].map((fils) {
                      final isSelected = selectedAmountFils == fils && customController.text.isEmpty;
                      return ChoiceChip(
                        label: Text(PioneerFormatters.formatFils(fils)),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            setSheetState(() {
                              selectedAmountFils = fils;
                              customController.clear();
                            });
                          }
                        },
                        selectedColor: PioneerColors.brandOrange.withValues(alpha: 0.2),
                        labelStyle: TextStyle(
                          color: isSelected ? PioneerColors.brandOrange : PioneerColors.textPrimary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: customController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: PioneerColors.textPrimary),
                    decoration: InputDecoration(
                      labelText: l10n.enterCustomAmount,
                      labelStyle: const TextStyle(color: PioneerColors.textSecondary),
                      prefixText: 'AED ',
                      prefixStyle: const TextStyle(color: PioneerColors.textPrimary),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onChanged: (val) {
                      final aed = int.tryParse(val);
                      if (aed != null && aed > 0) {
                        setSheetState(() {
                          selectedAmountFils = aed * 100;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PioneerColors.brandOrange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.lock_outline, size: 20),
                    label: Text(
                      '${l10n.proceedToPayment} (${PioneerFormatters.formatFils(selectedAmountFils)})',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      HapticFeedback.mediumImpact();
                      Navigator.pop(sheetContext);
                      _simulatePaymentGateway(selectedAmountFils, l10n);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _simulatePaymentGateway(int amountFils, PioneerLocalizations l10n) {
    setState(() {
      _availableFils += amountFils;
      _totalDepositedFils += amountFils;
      _entries.insert(
        0,
        DepositEntryItem(
          id: 'dl_${DateTime.now().millisecondsSinceEpoch}',
          amountFils: amountFils,
          direction: 'CREDIT',
          reasonCode: 'DEPOSIT_CLEARED',
          createdAt: DateTime.now(),
        ),
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF139744),
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: Colors.white),
            const SizedBox(width: 8),
            Text('${l10n.depositSuccessful}: ${PioneerFormatters.formatFils(amountFils)}'),
          ],
        ),
      ),
    );
  }

  void _showRefundSheet(BuildContext context, PioneerLocalizations l10n) {
    final amountController = TextEditingController();
    final reasonController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: PioneerColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.requestRefund,
                    style: const TextStyle(
                      color: PioneerColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: PioneerColors.textSecondary),
                    onPressed: () => Navigator.pop(sheetContext),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: PioneerColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: PioneerColors.brandOrange, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        l10n.refundNotice,
                        style: const TextStyle(color: PioneerColors.textSecondary, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '${l10n.availableDeposit}: ${PioneerFormatters.formatFils(_availableFils)}',
                style: const TextStyle(color: PioneerColors.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: PioneerColors.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Refund Amount (AED)',
                  labelStyle: const TextStyle(color: PioneerColors.textSecondary),
                  prefixText: 'AED ',
                  prefixStyle: const TextStyle(color: PioneerColors.textPrimary),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonController,
                style: const TextStyle(color: PioneerColors.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Reason for refund (optional)',
                  labelStyle: const TextStyle(color: PioneerColors.textSecondary),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: PioneerColors.brandPurple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: () {
                  final aed = int.tryParse(amountController.text.trim());
                  if (aed == null || aed <= 0) {
                    return;
                  }
                  final fils = aed * 100;
                  if (fils > _availableFils) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: Color(0xFFEE233E),
                        content: Text('Requested amount exceeds available deposit balance'),
                      ),
                    );
                    return;
                  }

                  HapticFeedback.mediumImpact();
                  Navigator.pop(sheetContext);

                  setState(() {
                    _availableFils -= fils;
                    _refundRequests.insert(
                      0,
                      DepositRefundItem(
                        id: 'ref_${DateTime.now().millisecondsSinceEpoch}',
                        amountFils: fils,
                        status: 'REQUESTED',
                        reason: reasonController.text.trim().isEmpty ? null : reasonController.text.trim(),
                        requestedAt: DateTime.now(),
                      ),
                    );
                  });

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Refund requested for ${PioneerFormatters.formatFils(fils)}. Settlement SLA: 3–5 business days.'),
                    ),
                  );
                },
                child: const Text('Submit Refund Request', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = PioneerLocalizations.of(context);

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: AppBar(
        title: Text(l10n.securityDeposits),
        backgroundColor: PioneerColors.surface,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Balance Overview Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  PioneerColors.brandPurpleDeep,
                  PioneerColors.surfaceSubtle,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: PioneerColors.brandPurple.withValues(alpha: 0.3),
                width: 1.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.availableDeposit,
                      style: const TextStyle(
                        color: PioneerColors.textSecondary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF139744).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shield_outlined, color: Color(0xFF139744), size: 14),
                          SizedBox(width: 4),
                          Text(
                            'Active',
                            style: TextStyle(
                              color: Color(0xFF139744),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  PioneerFormatters.formatFils(_availableFils),
                  style: const TextStyle(
                    color: PioneerColors.textPrimary,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(color: Colors.white12),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.heldDeposit,
                            style: const TextStyle(color: PioneerColors.textSecondary, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            PioneerFormatters.formatFils(_heldFils),
                            style: const TextStyle(color: PioneerColors.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.totalDeposited,
                            style: const TextStyle(color: PioneerColors.textSecondary, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            PioneerFormatters.formatFils(_totalDepositedFils),
                            style: const TextStyle(color: PioneerColors.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Primary Actions
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PioneerColors.brandOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.add_circle_outline, size: 20),
                  label: Text(l10n.addDeposit, style: const TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () => _showTopUpSheet(context, l10n),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PioneerColors.textPrimary,
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.undo_outlined, size: 20),
                  label: Text(l10n.requestRefund, style: const TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () => _showRefundSheet(context, l10n),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Pending Refunds if any
          if (_refundRequests.isNotEmpty) ...[
            const Text(
              'Pending Refunds',
              style: TextStyle(
                color: PioneerColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ..._refundRequests.map((ref) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: PioneerColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Refund: ${PioneerFormatters.formatFils(ref.amountFils)}',
                            style: const TextStyle(color: PioneerColors.textPrimary, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          const Text('Estimated 3–5 business days', style: TextStyle(color: PioneerColors.textSecondary, fontSize: 12)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          ref.status,
                          style: const TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 16),
          ],

          // Deposit Ledger History
          Text(
            l10n.depositHistory,
            style: const TextStyle(
              color: PioneerColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          if (_entries.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.center,
              child: const Text('No deposit history yet.', style: TextStyle(color: PioneerColors.textSecondary)),
            )
          else
            ..._entries.map((entry) {
              final isCredit = entry.direction == 'CREDIT';
              final iconColor = isCredit ? const Color(0xFF139744) : const Color(0xFF3B82F6);
              final icon = isCredit ? Icons.arrow_downward : Icons.arrow_upward;
              final sign = isCredit ? '+' : '-';

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: PioneerColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: iconColor.withValues(alpha: 0.15),
                      child: Icon(icon, color: iconColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entry.reasonCode.replaceAll('_', ' '),
                            style: const TextStyle(color: PioneerColors.textPrimary, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${entry.createdAt.year}-${entry.createdAt.month.toString().padLeft(2, '0')}-${entry.createdAt.day.toString().padLeft(2, '0')}',
                            style: const TextStyle(color: PioneerColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '$sign${PioneerFormatters.formatFils(entry.amountFils)}',
                      style: TextStyle(
                        color: iconColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
