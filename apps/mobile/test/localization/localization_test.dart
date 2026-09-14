import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';

void main() {
  group('Pioneer Localization & RTL Support', () {
    test('PioneerLocaleController switches locale', () {
      final controller = PioneerLocaleController.instance;
      controller.setLocale(const Locale('en'));
      expect(controller.isArabic, isFalse);
      expect(controller.locale.languageCode, 'en');

      controller.toggleLocale();
      expect(controller.isArabic, isTrue);
      expect(controller.locale.languageCode, 'ar');

      controller.toggleLocale();
      expect(controller.isArabic, isFalse);
      expect(controller.locale.languageCode, 'en');
    });

    test('PioneerLocalizations returns English strings for en locale', () {
      final l10n = PioneerLocalizations(const Locale('en'));
      expect(l10n.isArabic, isFalse);
      expect(l10n.appTitle, 'Pioneer Auctions');
      expect(l10n.navHome, 'Home');
      expect(l10n.navAuctions, 'Auctions');
      expect(l10n.navBrowse, 'Browse');
      expect(l10n.navMyBids, 'My Bids');
      expect(l10n.navAccount, 'Account');
      expect(l10n.liveAuction, 'LIVE AUCTION');
      expect(l10n.bidNow, 'Bid Now');
      expect(l10n.currencySymbol, 'AED');
    });

    test('PioneerLocalizations returns Arabic strings for ar locale', () {
      final l10n = PioneerLocalizations(const Locale('ar'));
      expect(l10n.isArabic, isTrue);
      expect(l10n.appTitle, 'بايونير للمزادات');
      expect(l10n.navHome, 'الرئيسية');
      expect(l10n.navAuctions, 'المزادات');
      expect(l10n.navBrowse, 'تصفح');
      expect(l10n.navMyBids, 'مزايداتي');
      expect(l10n.navAccount, 'حسابي');
      expect(l10n.liveAuction, 'مزاد مباشر');
      expect(l10n.bidNow, 'زايد الآن');
      expect(l10n.currencySymbol, 'د.إ');
    });

    testWidgets('PioneerLocalizationsDelegate resolves in widget tree', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('ar'),
          supportedLocales: const [Locale('en'), Locale('ar')],
          localizationsDelegates: const [
            PioneerLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: Builder(
            builder: (context) {
              final l10n = PioneerLocalizations.of(context);
              return Scaffold(
                body: Center(
                  child: Text(l10n.appTitle),
                ),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('بايونير للمزادات'), findsOneWidget);
    });
  });
}
