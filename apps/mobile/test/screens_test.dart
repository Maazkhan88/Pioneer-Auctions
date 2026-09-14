import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/theme/pioneer_theme.dart';
import 'package:pioneer_mobile/features/account/account_dashboard_screen.dart';
import 'package:pioneer_mobile/features/auctions/auctions_screen.dart';
import 'package:pioneer_mobile/features/browse/browse_lots_screen.dart';
import 'package:pioneer_mobile/features/home/home_screen.dart';
import 'package:pioneer_mobile/features/live_auction/live_auction_room_screen.dart';
import 'package:pioneer_mobile/features/lot_detail/lot_detail_screen.dart';
import 'package:pioneer_mobile/features/materials/materials_screen.dart';
import 'package:pioneer_mobile/features/my_bids/my_bids_screen.dart';
import 'package:pioneer_mobile/features/real_estate/real_estate_screen.dart';
import 'package:pioneer_mobile/features/vehicles/vehicles_screen.dart';

Widget _wrapScreen(Widget screen) {
  return MaterialApp(
    theme: PioneerTheme.lightTheme,
    home: screen,
  );
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  testWidgets('Screen 01 — Home renders correctly', (tester) async {
    tester.view.physicalSize = const Size(390 * 2.1872, 844 * 2.1872);
    tester.view.devicePixelRatio = 2.1872;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(_wrapScreen(const HomeScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Live Now'), findsOneWidget);
    expect(find.text('Upcoming Auctions'), findsOneWidget);
    expect(find.text('Featured Lots'), findsOneWidget);
    expect(find.text('Join Live >'), findsOneWidget);
  });

  testWidgets('Screen 02 — Auctions renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const AuctionsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Auctions'), findsWidgets);
    expect(find.textContaining('LIVE ('), findsOneWidget);
    expect(find.textContaining('UPCOMING ('), findsOneWidget);
    expect(find.textContaining('PAST ('), findsOneWidget);
  });

  testWidgets('Screen 03 — Browse Lots renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const BrowseLotsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Browse Lots'), findsOneWidget);
    expect(find.textContaining('Lots Available'), findsOneWidget);
  });

  testWidgets('Screen 04 — Vehicles renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const VehiclesScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Vehicles'), findsOneWidget);
    expect(find.textContaining('Vehicles Available'), findsOneWidget);
    expect(find.text('All Makes'), findsOneWidget);
  });

  testWidgets('Screen 05 — Real Estate renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const RealEstateScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Real Estate'), findsOneWidget);
    expect(find.textContaining('Properties Available'), findsOneWidget);
    expect(find.text('Villas'), findsOneWidget);
  });

  testWidgets('Screen 06 — General Materials renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const MaterialsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('General Materials'), findsOneWidget);
    expect(find.textContaining('Industrial Lots Found'), findsOneWidget);
    expect(find.text('All Equipment'), findsOneWidget);
  });

  testWidgets('Screen 07 — Lot Detail renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const LotDetailScreen(lotId: 'lot-118')));
    await tester.pumpAndSettle();

    expect(find.text('2022 BMW X5 xDrive40i'), findsOneWidget);
    expect(find.text('LIVE AUCTION'), findsOneWidget);
    expect(find.text('Overview'), findsOneWidget);
    expect(find.text('BID AED 87,000'), findsOneWidget);
  });

  testWidgets('Screen 08 — Live Auction Room renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const LiveAuctionRoomScreen(lotId: 'lot-118')));
    await tester.pumpAndSettle();

    expect(find.text('Live Auction Room'), findsOneWidget);
    expect(find.text('YOU\'RE WINNING'), findsOneWidget);
    expect(find.textContaining('GOING ONCE!'), findsOneWidget);
    expect(find.text('Live Bidding Activity'), findsOneWidget);
    expect(find.textContaining('Slide to place bid'), findsOneWidget);
  });

  testWidgets('Screen 09 — My Bids renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const MyBidsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('My Bids'), findsOneWidget);
    expect(find.textContaining('ACTIVE ('), findsOneWidget);
    expect(find.textContaining('WON ('), findsOneWidget);
    expect(find.textContaining('LOST ('), findsOneWidget);
  });

  testWidgets('Screen 10 — Account Dashboard renders correctly', (tester) async {
    await tester.pumpWidget(_wrapScreen(const AccountDashboardScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Ahmed Al Mansoori'), findsOneWidget);
    expect(find.text('Verified Account'), findsOneWidget);
    expect(find.text('Active Bids'), findsOneWidget);
    expect(find.text('Recent Activity'), findsOneWidget);
  });
}
