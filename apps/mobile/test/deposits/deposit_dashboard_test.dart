import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';
import 'package:pioneer_mobile/core/utils/formatters.dart';
import 'package:pioneer_mobile/features/deposits/deposit_dashboard_screen.dart';

Widget createDepositTestWidget({int initialBalance = 1000000}) {
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
    home: DepositDashboardScreen(
      initialAvailableFils: initialBalance,
    ),
  );
}

void main() {
  group('Task 009 — Security Deposit Dashboard & Financial Flows', () {
    testWidgets('renders balance overview card with correct fils formatting', (tester) async {
      await tester.pumpWidget(createDepositTestWidget(initialBalance: 1000000));
      await tester.pumpAndSettle();

      expect(find.text('Security Deposits'), findsOneWidget);
      expect(find.text('Available Balance'), findsOneWidget);
      expect(find.text(PioneerFormatters.formatFils(1000000)), findsWidgets);
      expect(find.text('Add Security Deposit'), findsOneWidget);
      expect(find.text('Request Refund'), findsOneWidget);
      expect(find.text('Deposit History'), findsOneWidget);
    });

    testWidgets('opens top-up sheet and simulates payment gateway success', (tester) async {
      await tester.pumpWidget(createDepositTestWidget(initialBalance: 500000));
      await tester.pumpAndSettle();

      // Tap Add Security Deposit button
      await tester.tap(find.text('Add Security Deposit'));
      await tester.pumpAndSettle();

      // Top up sheet should be visible
      expect(find.text('Proceed to Payment (\u2066AED 5,000\u2069)'), findsOneWidget);

      // Select 10,000 AED chip
      await tester.tap(find.text('\u2066AED 10,000\u2069'));
      await tester.pumpAndSettle();

      expect(find.text('Proceed to Payment (\u2066AED 10,000\u2069)'), findsOneWidget);

      // Tap Proceed to Payment
      await tester.tap(find.text('Proceed to Payment (\u2066AED 10,000\u2069)'));
      await tester.pumpAndSettle();

      // Balance should be incremented: 5,000 + 10,000 = 15,000 AED (1,500,000 fils)
      expect(find.text(PioneerFormatters.formatFils(1500000)), findsWidgets);
      expect(find.text('Deposit successfully cleared: \u2066AED 10,000\u2069'), findsOneWidget);
    });

    testWidgets('opens refund sheet and validates refundable balance threshold', (tester) async {
      await tester.pumpWidget(createDepositTestWidget(initialBalance: 500000)); // 5,000 AED
      await tester.pumpAndSettle();

      // Tap Request Refund
      await tester.tap(find.text('Request Refund'));
      await tester.pumpAndSettle();

      expect(find.text('Refunds are processed back to your original payment method within 3–5 business days.'), findsOneWidget);
      expect(find.text('Available Balance: \u2066AED 5,000\u2069'), findsOneWidget);

      // Enter amount exceeding available balance (e.g. 6,000 AED)
      await tester.enterText(find.byType(TextField).first, '6000');
      await tester.pumpAndSettle();

      await tester.tap(find.text('Submit Refund Request'));
      await tester.pumpAndSettle();

      // Should show error snackbar
      expect(find.text('Requested amount exceeds available deposit balance'), findsOneWidget);

      // Now enter valid amount (e.g. 2,000 AED)
      await tester.enterText(find.byType(TextField).first, '2000');
      await tester.pumpAndSettle();

      await tester.tap(find.text('Submit Refund Request'));
      await tester.pumpAndSettle();

      // Balance should be reduced: 5,000 - 2,000 = 3,000 AED (300,000 fils)
      expect(find.text(PioneerFormatters.formatFils(300000)), findsWidgets);
      expect(find.text('Pending Refunds'), findsOneWidget);
      expect(find.text('Refund: \u2066AED 2,000\u2069'), findsOneWidget);
    });
  });
}
