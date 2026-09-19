import 'package:flutter/material.dart';

import '../../core/localization/pioneer_localizations.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';

class NotificationPreferencesScreen extends StatefulWidget {
  final bool initialPushEnabled;
  final bool initialEmailEnabled;
  final bool initialSmsEnabled;
  final bool initialNotifyOutbid;
  final bool initialNotifyEndingSoon;
  final bool initialNotifyDeposits;
  final bool initialNotifyMarketing;
  final bool initialQuietHoursEnabled;
  final String initialQuietHoursStart;
  final String initialQuietHoursEnd;

  const NotificationPreferencesScreen({
    super.key,
    this.initialPushEnabled = true,
    this.initialEmailEnabled = true,
    this.initialSmsEnabled = false,
    this.initialNotifyOutbid = true,
    this.initialNotifyEndingSoon = true,
    this.initialNotifyDeposits = true,
    this.initialNotifyMarketing = false,
    this.initialQuietHoursEnabled = false,
    this.initialQuietHoursStart = '22:00',
    this.initialQuietHoursEnd = '07:00',
  });

  @override
  State<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  late bool _pushEnabled;
  late bool _emailEnabled;
  late bool _smsEnabled;

  late bool _notifyOutbid;
  late bool _notifyEndingSoon;
  late bool _notifyDeposits;
  late bool _notifyMarketing;

  late bool _quietHoursEnabled;
  late TimeOfDay _quietHoursStart;
  late TimeOfDay _quietHoursEnd;

  @override
  void initState() {
    super.initState();
    _pushEnabled = widget.initialPushEnabled;
    _emailEnabled = widget.initialEmailEnabled;
    _smsEnabled = widget.initialSmsEnabled;

    _notifyOutbid = widget.initialNotifyOutbid;
    _notifyEndingSoon = widget.initialNotifyEndingSoon;
    _notifyDeposits = widget.initialNotifyDeposits;
    _notifyMarketing = widget.initialNotifyMarketing;

    _quietHoursEnabled = widget.initialQuietHoursEnabled;
    _quietHoursStart = _parseTime(widget.initialQuietHoursStart);
    _quietHoursEnd = _parseTime(widget.initialQuietHoursEnd);
  }

  TimeOfDay _parseTime(String time) {
    try {
      final parts = time.split(':');
      return TimeOfDay(
        hour: int.parse(parts[0]),
        minute: int.parse(parts[1]),
      );
    } catch (_) {
      return const TimeOfDay(hour: 22, minute: 0);
    }
  }

  String _formatTime(TimeOfDay tod) {
    final hour = tod.hour.toString().padLeft(2, '0');
    final minute = tod.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  void _showSavedFeedback() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.l10n.preferencesSaved),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _pickTime({required bool isStart}) async {
    final initial = isStart ? _quietHoursStart : _quietHoursEnd;
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          _quietHoursStart = picked;
        } else {
          _quietHoursEnd = picked;
        }
      });
      _showSavedFeedback();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: AppBar(
        backgroundColor: PioneerColors.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 0,
        title: Text(
          l10n.notificationPreferences,
          style: PioneerTypography.pageTitle.copyWith(fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: PioneerColors.textPrimary),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        children: [
          // Section 1: Delivery Channels
          _buildSectionHeader(l10n.deliveryChannels, Icons.send_rounded),
          const SizedBox(height: 8),
          _buildCardGroup([
            _buildSwitchTile(
              title: l10n.pushNotifications,
              subtitle: 'Device alerts & lock-screen banners',
              value: _pushEnabled,
              onChanged: (val) {
                setState(() => _pushEnabled = val);
                _showSavedFeedback();
              },
            ),
            const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
            _buildSwitchTile(
              title: l10n.emailNotifications,
              subtitle: 'Outbid emails & financial receipts',
              value: _emailEnabled,
              onChanged: (val) {
                setState(() => _emailEnabled = val);
                _showSavedFeedback();
              },
            ),
            const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
            _buildSwitchTile(
              title: l10n.smsNotifications,
              subtitle: 'High-priority SMS alerts to registered UAE mobile',
              value: _smsEnabled,
              onChanged: (val) {
                setState(() => _smsEnabled = val);
                _showSavedFeedback();
              },
            ),
          ]),
          const SizedBox(height: 24),

          // Section 2: Alert Categories
          _buildSectionHeader(l10n.alertCategories, Icons.notifications_active_rounded),
          const SizedBox(height: 8),
          _buildCardGroup([
            _buildSwitchTile(
              title: l10n.notifyOutbidTitle,
              subtitle: l10n.notifyOutbidSubtitle,
              value: _notifyOutbid,
              onChanged: (val) {
                setState(() => _notifyOutbid = val);
                _showSavedFeedback();
              },
            ),
            const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
            _buildSwitchTile(
              title: l10n.notifyEndingSoonTitle,
              subtitle: l10n.notifyEndingSoonSubtitle,
              value: _notifyEndingSoon,
              onChanged: (val) {
                setState(() => _notifyEndingSoon = val);
                _showSavedFeedback();
              },
            ),
            const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
            _buildSwitchTile(
              title: l10n.notifyDepositsTitle,
              subtitle: l10n.notifyDepositsSubtitle,
              value: _notifyDeposits,
              onChanged: (val) {
                setState(() => _notifyDeposits = val);
                _showSavedFeedback();
              },
            ),
            const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
            _buildSwitchTile(
              title: l10n.notifyMarketingTitle,
              subtitle: l10n.notifyMarketingSubtitle,
              value: _notifyMarketing,
              onChanged: (val) {
                setState(() => _notifyMarketing = val);
                _showSavedFeedback();
              },
            ),
          ]),
          const SizedBox(height: 24),

          // Section 3: Quiet Hours
          _buildSectionHeader(l10n.quietHours, Icons.bedtime_rounded),
          const SizedBox(height: 8),
          _buildCardGroup([
            _buildSwitchTile(
              title: l10n.quietHours,
              subtitle: l10n.quietHoursSubtitle,
              value: _quietHoursEnabled,
              onChanged: (val) {
                setState(() => _quietHoursEnabled = val);
                _showSavedFeedback();
              },
            ),
            if (_quietHoursEnabled) ...[
              const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.quietHoursStart,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: PioneerColors.textPrimary,
                      ),
                    ),
                    InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => _pickTime(isStart: true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: PioneerColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: PioneerColors.border),
                        ),
                        child: Text(
                          _formatTime(_quietHoursStart),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: PioneerColors.brandPurple,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.quietHoursEnd,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: PioneerColors.textPrimary,
                      ),
                    ),
                    InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => _pickTime(isStart: false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: PioneerColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: PioneerColors.border),
                        ),
                        child: Text(
                          _formatTime(_quietHoursEnd),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: PioneerColors.brandPurple,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, indent: 16, color: PioneerColors.borderLight),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, size: 16, color: PioneerColors.textMuted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Timezone: Asia/Dubai (GST, UTC+4)',
                        style: TextStyle(
                          fontSize: 12,
                          color: PioneerColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ]),
          const SizedBox(height: 16),

          // Bypass Disclaimer Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: PioneerColors.brandOrangeLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: PioneerColors.brandOrange.withValues(alpha: 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.shield_outlined,
                  color: PioneerColors.brandOrange,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l10n.quietHoursBypassNotice,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: PioneerColors.textPrimary.withValues(alpha: 0.85),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: PioneerColors.brandPurple),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: PioneerColors.textPrimary,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }

  Widget _buildCardGroup(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: PioneerColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            offset: const Offset(0, 2),
            blurRadius: 6,
          ),
        ],
      ),
      child: Material(
        color: PioneerColors.surface,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: children,
        ),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile(
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w600,
          color: PioneerColors.textPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          color: PioneerColors.textSecondary,
        ),
      ),
      value: value,
      activeThumbColor: PioneerColors.brandPurple,
      activeTrackColor: PioneerColors.brandPurpleLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      onChanged: onChanged,
    );
  }
}
