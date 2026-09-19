import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/pioneer_colors.dart';
import '../design_system/components/pioneer_bottom_nav.dart';
import '../features/account/account_dashboard_screen.dart';
import '../features/auctions/auctions_screen.dart';
import '../features/browse/browse_lots_screen.dart';
import '../features/deposits/deposit_dashboard_screen.dart';
import '../features/home/home_screen.dart';
import '../features/kyc/emirates_id_verification_screen.dart';
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
            extendBody: true,
            backgroundColor: PioneerColors.background,
            body: Stack(
              children: [
                Positioned.fill(
                  child: navigationShell,
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: PioneerBottomNav(
                    currentIndex: navigationShell.currentIndex,
                    onTap: (index) {
                      navigationShell.goBranch(
                        index,
                        initialLocation: index == navigationShell.currentIndex,
                      );
                    },
                  ),
                ),
              ],
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
          final lotId = state.pathParameters['id'] ?? '';
          return LotDetailScreen(lotId: lotId);
        },
      ),
      // Task 010: Push notification deep-link alias /lot/:id -> LotDetailScreen
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/lot/:id',
        redirect: (context, state) => '/lots/${state.pathParameters['id']}',
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/live-auction/:id',
        builder: (context, state) {
          final lotId = state.pathParameters['id'] ?? '';
          return LiveAuctionRoomScreen(lotId: lotId);
        },
      ),
      // Task 008: Emirates ID document capture & verification
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/kyc/verify',
        builder: (context, state) => const EmiratesIdVerificationScreen(),
      ),
      // Task 009: Security Deposits dashboard
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/account/deposits',
        builder: (context, state) => const DepositDashboardScreen(),
      ),
      // Task 009: Hosted payment return contract stub
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/payment-return',
        builder: (context, state) {
          final status = state.uri.queryParameters['status'] ?? 'success';
          final reference = state.uri.queryParameters['reference'] ?? 'REF-PAYMENT';
          return Scaffold(
            appBar: AppBar(title: const Text('Payment Return')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      status == 'success' ? Icons.check_circle_rounded : Icons.error_rounded,
                      color: status == 'success' ? const Color(0xFF139744) : const Color(0xFFEE233E),
                      size: 64,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      status == 'success' ? 'Payment Successful' : 'Payment Failed',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text('Reference: $reference', style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => context.go('/account'),
                      child: const Text('Go to Account Dashboard'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    ],
  );
}
