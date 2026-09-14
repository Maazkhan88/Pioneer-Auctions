import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../design_system/components/pioneer_bottom_nav.dart';
import '../features/account/account_dashboard_screen.dart';
import '../features/auctions/auctions_screen.dart';
import '../features/browse/browse_lots_screen.dart';
import '../features/home/home_screen.dart';
import '../features/live_auction/live_auction_room_screen.dart';
import '../features/lot_detail/lot_detail_screen.dart';
import '../features/materials/materials_screen.dart';
import '../features/my_bids/my_bids_screen.dart';
import '../features/real_estate/real_estate_screen.dart';
import '../features/vehicles/vehicles_screen.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

class PioneerRouter {
  static final GoRouter router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return Scaffold(
            body: navigationShell,
            bottomNavigationBar: PioneerBottomNav(
              currentIndex: navigationShell.currentIndex,
              onTap: (index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
            ),
          );
        },
        branches: [
          // Branch 0: Home
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          // Branch 1: Auctions
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/auctions',
                builder: (context, state) => const AuctionsScreen(),
              ),
            ],
          ),
          // Branch 2: Browse / Watchlist
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/browse',
                builder: (context, state) => const BrowseLotsScreen(),
              ),
            ],
          ),
          // Branch 3: My Bids
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/my-bids',
                builder: (context, state) => const MyBidsScreen(),
              ),
            ],
          ),
          // Branch 4: Account / Profile
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/account',
                builder: (context, state) => const AccountDashboardScreen(),
              ),
            ],
          ),
        ],
      ),
      // Fullscreen sub-routes outside bottom navigation shell
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/vehicles',
        builder: (context, state) => const VehiclesScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/real-estate',
        builder: (context, state) => const RealEstateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/materials',
        builder: (context, state) => const MaterialsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/lots/:id',
        builder: (context, state) {
          final lotId = state.pathParameters['id'] ?? 'lot-118';
          return LotDetailScreen(lotId: lotId);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/live-auction/:id',
        builder: (context, state) {
          final lotId = state.pathParameters['id'] ?? 'lot-118';
          return LiveAuctionRoomScreen(lotId: lotId);
        },
      ),
    ],
  );
}
