import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_bottom_nav.dart';

void main() {
  group('PioneerBottomNav Accessibility & Localization', () {
    Widget buildNavHarness({
      int currentIndex = 0,
      ValueChanged<int>? onTap,
      Locale locale = const Locale('en'),
      TextDirection textDirection = TextDirection.ltr,
      bool disableAnimations = false,
      double textScaleFactor = 1.0,
    }) {
      return MaterialApp(
        locale: locale,
        localizationsDelegates: PioneerLocalizations.localizationsDelegates,
        supportedLocales: PioneerLocalizations.supportedLocales,
        home: MediaQuery(
          data: MediaQueryData(
            disableAnimations: disableAnimations,
            textScaler: TextScaler.linear(textScaleFactor),
          ),
          child: Directionality(
            textDirection: textDirection,
            child: Scaffold(
              bottomNavigationBar: PioneerBottomNav(
                currentIndex: currentIndex,
                onTap: onTap ?? (_) {},
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('renders English labels by default', (tester) async {
      await tester.pumpWidget(buildNavHarness());
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Auctions'), findsOneWidget);
      expect(find.text('Browse'), findsOneWidget);
      expect(find.text('My Bids'), findsOneWidget);
      expect(find.text('Account'), findsOneWidget);
    });

    testWidgets('renders Arabic labels in ar locale', (tester) async {
      await tester.pumpWidget(buildNavHarness(
        locale: const Locale('ar'),
        textDirection: TextDirection.rtl,
      ));
      await tester.pumpAndSettle();

      expect(find.text('الرئيسية'), findsOneWidget);
      expect(find.text('المزادات'), findsOneWidget);
      expect(find.text('تصفح'), findsOneWidget);
      expect(find.text('مزايداتي'), findsOneWidget);
      expect(find.text('حسابي'), findsOneWidget);
    });

    testWidgets('exposes Semantics nodes for screen readers with selected state', (tester) async {
      await tester.pumpWidget(buildNavHarness(currentIndex: 2));
      await tester.pumpAndSettle();

      final semanticsFinder = find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.button == true && w.properties.label == 'Browse',
      );
      expect(semanticsFinder, findsOneWidget);
      final browseSemantics = tester.widget<Semantics>(semanticsFinder);
      expect(browseSemantics.properties.selected, isTrue);

      final homeSemanticsFinder = find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.button == true && w.properties.label == 'Home',
      );
      expect(homeSemanticsFinder, findsOneWidget);
      final homeSemantics = tester.widget<Semantics>(homeSemanticsFinder);
      expect(homeSemantics.properties.selected, isFalse);
    });

    testWidgets('mirrors layout order in RTL mode', (tester) async {
      await tester.pumpWidget(buildNavHarness(
        locale: const Locale('ar'),
        textDirection: TextDirection.rtl,
      ));
      await tester.pumpAndSettle();

      // In RTL, the first tab (Home / الرئيسية) is at the far right
      final homeTopRight = tester.getTopRight(find.text('الرئيسية'));
      final accountTopLeft = tester.getTopLeft(find.text('حسابي'));
      expect(homeTopRight.dx, greaterThan(accountTopLeft.dx));
    });

    testWidgets('respects disableAnimations without failing', (tester) async {
      await tester.pumpWidget(buildNavHarness(
        disableAnimations: true,
        currentIndex: 1,
      ));
      await tester.pump();
      expect(find.text('Auctions'), findsOneWidget);
    });

    testWidgets('survives large text scaling (1.3x and 2.0x) without overflow', (tester) async {
      for (final scale in [1.3, 2.0]) {
        await tester.pumpWidget(buildNavHarness(textScaleFactor: scale));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Overflow occurred at scale $scale');
        expect(find.text('Home'), findsOneWidget);
        expect(find.text('Auctions'), findsOneWidget);
        expect(find.text('Browse'), findsOneWidget);
      }
    });

    testWidgets('provides minimum 48x48 interactive touch targets', (tester) async {
      await tester.pumpWidget(buildNavHarness());
      await tester.pumpAndSettle();

      final inkWells = find.byType(InkWell);
      expect(inkWells, findsNWidgets(5));

      for (int i = 0; i < 5; i++) {
        final size = tester.getSize(inkWells.at(i));
        expect(size.width, greaterThanOrEqualTo(48.0));
        expect(size.height, greaterThanOrEqualTo(48.0));
      }
    });
  });
}
