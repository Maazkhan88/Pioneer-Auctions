import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/main.dart';

void main() {
  testWidgets('Pioneer Auctions app smoke test - launches and renders home shell', (WidgetTester tester) async {
    // Set canonical viewport 390 x 844
    tester.view.physicalSize = const Size(390 * 2.1872, 844 * 2.1872);
    tester.view.devicePixelRatio = 2.1872;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(const PioneerMobileApp());
    await tester.pumpAndSettle();

    // Verify 5 bottom navigation tabs exist
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Auctions'), findsWidgets);
    expect(find.text('Watchlist'), findsWidgets);
    expect(find.text('My Bids'), findsWidgets);
    expect(find.text('Profile'), findsWidgets);

    // Verify Home Screen Content
    expect(find.text('Live Now'), findsOneWidget);
    expect(find.text('Upcoming Auctions'), findsOneWidget);
    expect(find.text('Featured Lots'), findsOneWidget);
    expect(find.text('Vehicles'), findsWidgets);
    expect(find.text('Real Estate'), findsWidgets);

    // Scroll category discovery horizontally to reveal General Materials
    final categoryList = find.byType(ListView).first;
    await tester.drag(categoryList, const Offset(-250, 0));
    await tester.pumpAndSettle();
    expect(find.text('General Materials'), findsWidgets);

    // Verify Tab Switching to Auctions
    await tester.tap(find.text('Auctions'));
    await tester.pumpAndSettle();
    expect(find.textContaining('LIVE ('), findsOneWidget);
  });
}
