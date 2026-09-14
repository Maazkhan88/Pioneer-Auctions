import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/models/lot_model.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_bottom_nav.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_slide_to_bid.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_status_chip.dart';

void main() {
  testWidgets('PioneerSlideToBid renders and triggers onConfirmed', (WidgetTester tester) async {
    bool confirmed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 350,
              child: PioneerSlideToBid(
                bidAmount: 87000,
                onConfirmed: () async {
                  confirmed = true;
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Slide to place bid of AED 87,000'), findsOneWidget);

    // Find the draggable knob
    final knobFinder = find.byType(GestureDetector);
    expect(knobFinder, findsOneWidget);

    // Drag knob across threshold (>85%)
    await tester.drag(knobFinder, const Offset(300, 0));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(confirmed, isTrue);
    expect(find.text('BID CONFIRMED!'), findsOneWidget);

    // Pump past reset timer
    await tester.pump(const Duration(seconds: 2));
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
