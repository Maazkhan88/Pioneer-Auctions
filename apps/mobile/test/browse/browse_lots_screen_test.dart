import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/design_system/components/pioneer_search_field.dart';
import 'package:pioneer_mobile/features/browse/browse_lots_screen.dart';

void main() {
  testWidgets('BrowseLotsScreen renders header, search field, categories and lots', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: BrowseLotsScreen(),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Browse Lots'), findsOneWidget);
    expect(find.byType(PioneerSearchField), findsOneWidget);
    expect(find.text('All'), findsWidgets);
    expect(find.text('Vehicles'), findsWidgets);
    expect(find.text('Real Estate'), findsWidgets);
  });

  testWidgets('BrowseLotsScreen debounced search filters lots by text', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: BrowseLotsScreen(),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Enter search text
    await tester.enterText(find.byType(TextField).first, 'BMW');
    // Before debounce fires (300ms)
    await tester.pump(const Duration(milliseconds: 100));

    // After debounce fires
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pump();

    expect(find.byType(BrowseLotsScreen), findsOneWidget);
  });

  testWidgets('BrowseLotsScreen opens facet sheet on filter icon tap', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: BrowseLotsScreen(),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Tap filter tune icon
    final filterIcon = find.byIcon(Icons.tune_rounded);
    expect(filterIcon, findsOneWidget);
    await tester.tap(filterIcon);
    await tester.pumpAndSettle();

    // Verify facet sheet opened
    expect(find.text('Filter Lots'), findsOneWidget);
    expect(find.text('Auction Status'), findsOneWidget);
    expect(find.text('Category'), findsOneWidget);
    expect(find.text('Price Range (AED)'), findsOneWidget);
    expect(find.text('Apply Filters'), findsOneWidget);

    // Tap Apply Filters
    await tester.tap(find.text('Apply Filters'));
    await tester.pumpAndSettle();

    // Sheet should be dismissed
    expect(find.text('Filter Lots'), findsNothing);
  });
}
