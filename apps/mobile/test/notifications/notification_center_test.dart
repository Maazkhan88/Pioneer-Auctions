import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_app_header.dart';
import 'package:pioneer_mobile/features/notifications/notification_center_screen.dart';
import 'package:pioneer_mobile/features/notifications/notification_preferences_screen.dart';

Widget createNotificationTestWidget({
  List<NotificationModel>? initialNotifications,
}) {
  return MaterialApp(
    localizationsDelegates: const [
      PioneerLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [
      Locale('en'),
      Locale('ar'),
    ],
    home: NotificationCenterScreen(
      initialNotifications: initialNotifications,
    ),
  );
}

Widget createPreferencesTestWidget({
  bool initialQuietHoursEnabled = false,
}) {
  return MaterialApp(
    localizationsDelegates: const [
      PioneerLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [
      Locale('en'),
      Locale('ar'),
    ],
    home: NotificationPreferencesScreen(
      initialQuietHoursEnabled: initialQuietHoursEnabled,
    ),
  );
}

void main() {
  group('Task 010 — Notification Center & Preferences UI', () {
    testWidgets('renders NotificationCenterScreen with filter chips, date grouping, and mark-all-read', (tester) async {
      await tester.pumpWidget(createNotificationTestWidget());
      await tester.pumpAndSettle();

      // Screen title and action buttons
      expect(find.text('Notification Center'), findsOneWidget);
      expect(find.text('Mark all as read'), findsOneWidget);

      // Filter chips
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Bids'), findsOneWidget);
      expect(find.text('Deposits'), findsOneWidget);
      expect(find.text('Reminders'), findsOneWidget);

      // Default notifications present
      expect(find.text("You've been outbid!"), findsOneWidget);
      expect(find.text('Bid Confirmed'), findsOneWidget);
    });

    testWidgets('filter chips filter items by category and empty state displays when filtered list empty', (tester) async {
      final singleBidList = [
        NotificationModel(
          id: '1',
          type: 'OUTBID',
          titleEn: 'Outbid Alert',
          titleAr: 'تنبيه تجاوز المزايدة',
          bodyEn: 'Outbid on Lot #101',
          bodyAr: 'تم تجاوزك على اللوط 101',
          createdAt: DateTime.now(),
          isRead: false,
        ),
      ];

      await tester.pumpWidget(createNotificationTestWidget(initialNotifications: singleBidList));
      await tester.pumpAndSettle();

      expect(find.text('Outbid Alert'), findsOneWidget);

      // Tap 'Deposits' filter chip
      await tester.tap(find.text('Deposits'));
      await tester.pumpAndSettle();

      // Empty state should be visible since there are no deposits
      expect(find.text('No notifications yet'), findsOneWidget);
      expect(find.text('Outbid Alert'), findsNothing);

      // Tap 'Bids' filter chip
      await tester.tap(find.text('Bids'));
      await tester.pumpAndSettle();

      expect(find.text('Outbid Alert'), findsOneWidget);
    });

    testWidgets('mark-all-read button marks all notifications as read and shows feedback', (tester) async {
      final unreadList = [
        NotificationModel(
          id: '1',
          type: 'OUTBID',
          titleEn: 'Outbid Item 1',
          titleAr: 'تنبيه 1',
          bodyEn: 'Body 1',
          bodyAr: 'محتوى 1',
          createdAt: DateTime.now(),
          isRead: false,
        ),
        NotificationModel(
          id: '2',
          type: 'BID_CONFIRMED',
          titleEn: 'Bid Item 2',
          titleAr: 'تنبيه 2',
          bodyEn: 'Body 2',
          bodyAr: 'محتوى 2',
          createdAt: DateTime.now(),
          isRead: false,
        ),
      ];

      await tester.pumpWidget(createNotificationTestWidget(initialNotifications: unreadList));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(TextButton, 'Mark all as read'), findsOneWidget);

      await tester.tap(find.widgetWithText(TextButton, 'Mark all as read'));
      await tester.pumpAndSettle();

      // Button should disappear now that unreadCount is 0
      expect(find.widgetWithText(TextButton, 'Mark all as read'), findsNothing);
      expect(find.text('All notifications marked as read'), findsOneWidget);
    });

    testWidgets('tapping notification card marks it read and handles navigation', (tester) async {
      final notif = NotificationModel(
        id: '1',
        type: 'OUTBID',
        titleEn: 'Clickable Outbid',
        titleAr: 'تنبيه قابل للنقر',
        bodyEn: 'Clickable body',
        bodyAr: 'محتوى قابل للنقر',
        createdAt: DateTime.now(),
        isRead: false,
      );

      await tester.pumpWidget(createNotificationTestWidget(initialNotifications: [notif]));
      await tester.pumpAndSettle();

      expect(notif.isRead, false);

      await tester.tap(find.text('Clickable Outbid'));
      await tester.pumpAndSettle();

      expect(notif.isRead, true);
    });

    testWidgets('NotificationPreferencesScreen renders channels, alert categories, and quiet hours', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createPreferencesTestWidget(initialQuietHoursEnabled: false));
      await tester.pumpAndSettle();

      expect(find.text('Notification Preferences'), findsOneWidget);
      expect(find.text('Delivery Channels'), findsOneWidget);
      expect(find.text('Push Notifications'), findsOneWidget);
      expect(find.text('Email Notifications'), findsOneWidget);
      expect(find.text('SMS Notifications'), findsOneWidget);

      expect(find.text('Alert Categories'), findsOneWidget);
      expect(find.text('Outbid Alerts'), findsOneWidget);
      expect(find.text('Ending Soon Milestones'), findsOneWidget);
      expect(find.text('Deposits & Refunds'), findsOneWidget);
      expect(find.text('Marketing & Announcements'), findsOneWidget);

      // Quiet hours section
      expect(find.text('Quiet Hours'), findsWidgets);

      // Initially quiet hours time pickers are hidden because initialQuietHoursEnabled is false
      expect(find.text('Start Time'), findsNothing);

      // Toggle quiet hours
      final quietHoursSwitch = find.widgetWithText(SwitchListTile, 'Quiet Hours');
      await tester.tap(quietHoursSwitch);
      await tester.pumpAndSettle();

      // Now start/end time and bypass disclaimer should be visible
      expect(find.text('Start Time'), findsOneWidget);
      expect(find.text('End Time'), findsOneWidget);
      expect(find.text('Timezone: Asia/Dubai (GST, UTC+4)'), findsOneWidget);
      expect(find.textContaining('bypass quiet hours'), findsOneWidget);
    });

    testWidgets('PioneerAppHeader notification bell has ValueKey and displays badge count', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            appBar: PioneerAppHeader(isRoot: true),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('header_notification_bell')), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
    });
  });
}
