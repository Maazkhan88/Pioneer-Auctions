import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/auction_model.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_button.dart';
import '../../design_system/components/pioneer_lot_card.dart';
import '../../design_system/components/pioneer_search_field.dart';
import '../../design_system/components/pioneer_status_chip.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = PioneerMockRepository.instance;
    final auctions = repo.getAuctions();
    final liveAuction = auctions.firstWhere((a) => a.status == AuctionStatus.live);
    final upcomingAuctions = auctions.where((a) => a.status == AuctionStatus.upcoming).toList();
    final lots = repo.getLots();
    final featuredLots = lots.take(4).toList();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: const PioneerAppHeader(isRoot: true),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 12),
            // Search Field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              child: PioneerSearchField(
                onTap: () => context.push('/browse'),
                readOnly: true,
                onFilterTap: () => context.push('/browse'),
              ),
            ),
            const SizedBox(height: 18),

            // 3 Category Discovery Cards (Vehicles, Real Estate, General Materials)
            _buildCategoryDiscoverySection(context),
            const SizedBox(height: PioneerSpacing.sectionSpacing),

            // Live Now Hero Section
            _buildLiveNowSection(context, liveAuction),
            const SizedBox(height: PioneerSpacing.sectionSpacing),

            // Upcoming Auctions Section
            _buildUpcomingAuctionsSection(context, upcomingAuctions),
            const SizedBox(height: PioneerSpacing.sectionSpacing),

            // Featured Lots Section
            _buildFeaturedLotsSection(context, featuredLots),
            const SizedBox(height: PioneerSpacing.sectionSpacing),

            // Promotional Skyline Banner
            _buildPromotionalBanner(context),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryDiscoverySection(BuildContext context) {
    final categories = [
      {
        'title': 'Vehicles',
        'subtitle': 'Cars, Trucks, Heavy Vehicles & More',
        'image': AssetPaths.catVehicles,
        'icon': Icons.directions_car_rounded,
        'route': '/vehicles',
      },
      {
        'title': 'Real Estate',
        'subtitle': 'Villas, Apartments, Land & Commercial',
        'image': AssetPaths.catRealEstate,
        'icon': Icons.apartment_rounded,
        'route': '/real-estate',
      },
      {
        'title': 'General Materials',
        'subtitle': 'Equipment, Machinery, Surplus & Assets',
        'image': AssetPaths.catMaterials,
        'icon': Icons.precision_manufacturing_rounded,
        'route': '/materials',
      },
    ];

    return SizedBox(
      height: 144,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final cat = categories[index];
          return GestureDetector(
            onTap: () => context.push(cat['route'] as String),
            child: Container(
              width: 230,
              height: 144,
              decoration: BoxDecoration(
                borderRadius: PioneerSpacing.borderRadiusCard,
                boxShadow: PioneerSpacing.cardShadow,
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.asset(
                      cat['image'] as String,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.3),
                            Colors.black.withValues(alpha: 0.75),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        cat['icon'] as IconData,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    left: 12,
                    right: 48,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cat['title'] as String,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          cat['subtitle'] as String,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 10.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        size: 16,
                        color: PioneerColors.brandPurple,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLiveNowSection(BuildContext context, AuctionItem liveAuction) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: const BoxDecoration(
                      color: PioneerColors.liveRed,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const Text('Live Now', style: PioneerTypography.sectionTitle),
                ],
              ),
              GestureDetector(
                onTap: () => context.push('/auctions'),
                child: Text(
                  'View All >',
                  style: PioneerTypography.metadata.copyWith(
                    color: PioneerColors.brandPurple,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Hero Live Card
          Container(
            decoration: BoxDecoration(
              color: PioneerColors.surface,
              borderRadius: PioneerSpacing.borderRadiusCard,
              border: Border.all(color: PioneerColors.border, width: 1.0),
              boxShadow: PioneerSpacing.cardShadow,
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    AspectRatio(
                      aspectRatio: 2.1,
                      child: Image.asset(
                        liveAuction.imagePath,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.4),
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.3),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const Positioned(
                      top: 10,
                      left: 12,
                      child: PioneerStatusChip(status: LotStatus.live),
                    ),
                    if (liveAuction.timeRemaining != null)
                      Positioned(
                        top: 10,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.access_time_rounded, size: 12, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(
                                '${PioneerFormatters.countdown(liveAuction.timeRemaining!, includeSeconds: false)} left',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        liveAuction.title,
                        style: PioneerTypography.sectionTitle.copyWith(fontSize: 16),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            'Current Lot #${liveAuction.currentLotNumber}',
                            style: PioneerTypography.metadata.copyWith(
                              fontWeight: FontWeight.w700,
                              color: PioneerColors.brandPurple,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text('•', style: PioneerTypography.metadata),
                          const SizedBox(width: 6),
                          Text(
                            '${liveAuction.lotCount} Total Lots',
                            style: PioneerTypography.metadata,
                          ),
                          const SizedBox(width: 6),
                          Text('•', style: PioneerTypography.metadata),
                          const SizedBox(width: 6),
                          Text(
                            liveAuction.location,
                            style: PioneerTypography.metadata,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      PioneerButton(
                        label: 'Join Live >',
                        onPressed: () => context.push('/live-auction/lot-118'),
                        trailingIcon: Icons.arrow_forward_rounded,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingAuctionsSection(BuildContext context, List<AuctionItem> upcoming) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text('Upcoming Auctions', style: PioneerTypography.sectionTitle),
              ),
              GestureDetector(
                onTap: () => context.push('/auctions'),
                child: Text(
                  'View All >',
                  style: PioneerTypography.metadata.copyWith(
                    color: PioneerColors.brandPurple,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 205,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
            scrollDirection: Axis.horizontal,
            itemCount: upcoming.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final auc = upcoming[index];
              return Container(
                width: 250,
                decoration: BoxDecoration(
                  color: PioneerColors.surface,
                  borderRadius: PioneerSpacing.borderRadiusCard,
                  border: Border.all(color: PioneerColors.border, width: 1.0),
                  boxShadow: PioneerSpacing.cardShadow,
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Stack(
                      children: [
                        AspectRatio(
                          aspectRatio: 2.2,
                          child: Image.asset(auc.imagePath, fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 8,
                          left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: PioneerColors.upcomingPurple,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'UPCOMING',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(10.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              auc.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: PioneerTypography.cardTitle.copyWith(fontSize: 13.0),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              auc.dateString,
                              style: PioneerTypography.metadata.copyWith(
                                color: PioneerColors.brandPurple,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${auc.lotCount} Lots • ${auc.location}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: PioneerTypography.metadata,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFeaturedLotsSection(BuildContext context, List<LotItem> lots) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text('Featured Lots', style: PioneerTypography.sectionTitle),
              ),
              GestureDetector(
                onTap: () => context.push('/browse'),
                child: Text(
                  'View All >',
                  style: PioneerTypography.metadata.copyWith(
                    color: PioneerColors.brandPurple,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 260,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
            scrollDirection: Axis.horizontal,
            itemCount: lots.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final lot = lots[index];
              return PioneerLotCard(
                lot: lot,
                width: 175,
                onTap: () => context.push('/lots/${lot.id}'),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPromotionalBanner(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
      child: Container(
        height: 130,
        decoration: BoxDecoration(
          borderRadius: PioneerSpacing.borderRadiusCard,
          boxShadow: PioneerSpacing.cardShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Positioned.fill(
              child: Image.asset(
                AssetPaths.bannerDubai,
                fit: BoxFit.cover,
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      PioneerColors.brandPurpleDeep.withValues(alpha: 0.92),
                      PioneerColors.brandPurple.withValues(alpha: 0.7),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Trusted Auctions for a\nStronger Tomorrow',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: PioneerColors.brandOrange,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          children: [
                            Text(
                              'Bid. Win. Move Forward. >',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
