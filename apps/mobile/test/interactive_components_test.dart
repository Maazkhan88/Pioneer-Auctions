import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/constants/pioneer_spacing.dart';
import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';
import 'package:pioneer_mobile/core/models/lot_model.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_bottom_nav.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_slide_to_bid.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_status_chip.dart';

void main() {
  testWidgets('PioneerSlideToBid renders and triggers onSubmitRequested', (WidgetTester tester) async {
    bool submitted = false;

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: PioneerLocalizations.localizationsDelegates,
        supportedLocales: PioneerLocalizations.supportedLocales,
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 350,
              child: PioneerSlideToBid(
                bidAmount: 87000,
                onSubmitRequested: () async {
                  submitted = true;
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Slide to place bid'), findsOneWidget);
    expect(find.textContaining('87,000'), findsWidgets);

    // Find the draggable knob
    final knobFinder = find.byType(GestureDetector);
    expect(knobFinder, findsWidgets);

    // Drag knob across threshold (>85%)
    await tester.drag(knobFinder.first, const Offset(300, 0));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(submitted, isTrue);
  });

  testWidgets('PioneerBottomNav switches tabs', (WidgetTester tester) async {
    int selectedIndex = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            return Scaffold(
              bottomNavigationBar: PioneerBottomNav(
                currentIndex: selectedIndex,
                onTap: (index) {
                  setState(() => selectedIndex = index);
                },
              ),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(selectedIndex, 0);

    // Tap on 'Auctions'
    await tester.tap(find.text('Auctions'));
    await tester.pumpAndSettle();
    expect(selectedIndex, 1);

    // Tap on 'My Bids'
    await tester.tap(find.text('My Bids'));
    await tester.pumpAndSettle();
    expect(selectedIndex, 3);
  });

  testWidgets('PioneerBottomNav renders Material 3 Expressive floating pill with clearance', (WidgetTester tester) async {
    // Verify spacing constants provide proper floating clearance above the bar
    expect(PioneerSpacing.floatingNavClearance, greaterThanOrEqualTo(110.0));
    expect(PioneerSpacing.floatingNavHeight, equals(66.0));
    expect(PioneerSpacing.radiusFloatingNav, equals(34.0));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Stack(
            children: [
              Positioned.fill(
                child: ListView(
                  children: const [
                    Text('Content behind nav bar'),
                  ],
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: PioneerBottomNav(
                  currentIndex: 0,
                  onTap: (_) {},
                ),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify floating pill structure: ClipRRect with BackdropFilter and AnimatedContainers
    expect(find.byType(BackdropFilter), findsOneWidget);
    expect(find.byType(ClipRRect), findsWidgets);
    expect(find.byType(AnimatedContainer), findsWidgets);
    expect(find.text('Content behind nav bar'), findsOneWidget);
  });

  testWidgets('PioneerStatusChip renders all status badges', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              PioneerStatusChip(status: LotStatus.live),
              PioneerStatusChip(status: LotStatus.upcoming),
              PioneerStatusChip(status: LotStatus.registered),
              PioneerStatusChip(status: LotStatus.endingSoon),
              PioneerStatusChip(status: LotStatus.winning),
              PioneerStatusChip(status: LotStatus.outbid),
              PioneerStatusChip(status: LotStatus.won),
              PioneerStatusChip(status: LotStatus.lost),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('LIVE'), findsOneWidget);
    expect(find.text('UPCOMING'), findsOneWidget);
    expect(find.text('REGISTERED'), findsOneWidget);
    expect(find.text('ENDING SOON'), findsOneWidget);
    expect(find.text('WINNING'), findsOneWidget);
    expect(find.text('OUTBID'), findsOneWidget);
    expect(find.text('WON'), findsOneWidget);
    expect(find.text('LOST'), findsOneWidget);
  });
}
