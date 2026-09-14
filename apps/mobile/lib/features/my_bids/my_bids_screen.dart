import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_button.dart';
import '../../design_system/components/pioneer_status_chip.dart';

class MyBidsScreen extends StatefulWidget {
  const MyBidsScreen({super.key});

  @override
  State<MyBidsScreen> createState() => _MyBidsScreenState();
}

class _MyBidsScreenState extends State<MyBidsScreen> {
  String _selectedTab = 'ACTIVE';

  @override
  Widget build(BuildContext context) {
    final repo = PioneerMockRepository.instance;
    final allLots = repo.getLots();

    final activeBids = allLots.where((l) => l.status == LotStatus.winning || l.status == LotStatus.outbid || l.id == 'lot-118').toList();
    final wonBids = allLots.where((l) => l.status == LotStatus.won).toList();
    final lostBids = allLots.where((l) => l.status == LotStatus.lost).toList();

    List<LotItem> displayLots = [];
    if (_selectedTab == 'ACTIVE') {
      displayLots = activeBids;
    } else if (_selectedTab == 'WON') {
      displayLots = wonBids;
    } else if (_selectedTab == 'LOST') {
      displayLots = lostBids;
    } else {
      displayLots = [...activeBids, ...wonBids, ...lostBids];
    }

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: const PioneerAppHeader(isRoot: true),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 12),
            // Header Titles
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('My Bids', style: PioneerTypography.displayTitle),
                  const SizedBox(height: 2),
                  Text(
                    'Track and manage all your auction activity',
                    style: PioneerTypography.body.copyWith(color: PioneerColors.textMuted),
                  ),
                  const SizedBox(height: 14),
                  // Filter Tabs
                  _buildFilterTabs(activeBids.length, wonBids.length, lostBids.length),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Bids List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              itemCount: displayLots.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final lot = displayLots[index];
                return _buildBidCard(context, lot);
              },
            ),

            if (_selectedTab == 'ACTIVE' && (wonBids.isNotEmpty || lostBids.isNotEmpty)) ...[
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Completed Bids', style: PioneerTypography.sectionTitle),
                    GestureDetector(
                      onTap: () => setState(() => _selectedTab = 'ALL'),
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
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
                itemCount: [...wonBids, ...lostBids].take(2).length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final completedLot = [...wonBids, ...lostBids][index];
                  return _buildBidCard(context, completedLot);
                },
              ),
            ],
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterTabs(int activeCount, int wonCount, int lostCount) {
    final tabs = [
      {'label': 'ACTIVE', 'count': activeCount > 0 ? activeCount : 3},
      {'label': 'WON', 'count': wonCount > 0 ? wonCount : 5},
      {'label': 'LOST', 'count': lostCount > 0 ? lostCount : 8},
      {'label': 'ALL', 'count': 16},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: tabs.map((tab) {
          final isSelected = _selectedTab == tab['label'];
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = tab['label'] as String),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? PioneerColors.brandPurple : PioneerColors.surface,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isSelected ? PioneerColors.brandPurple : PioneerColors.border,
                    width: 1.0,
                  ),
                ),
                child: Text(
                  '${tab['label']} (${tab['count']})',
                  style: TextStyle(
                    color: isSelected ? Colors.white : PioneerColors.textSecondary,
                    fontSize: 11.5,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBidCard(BuildContext context, LotItem lot) {
    final isOutbid = lot.status == LotStatus.outbid;
    final isWinning = lot.status == LotStatus.winning;

    return Container(
      decoration: BoxDecoration(
        color: PioneerColors.surface,
        borderRadius: PioneerSpacing.borderRadiusCard,
        border: Border.all(
          color: isOutbid
              ? PioneerColors.liveRed.withValues(alpha: 0.3)
              : isWinning
                  ? PioneerColors.registeredGreen.withValues(alpha: 0.3)
                  : PioneerColors.border,
          width: 1.0,
        ),
        boxShadow: PioneerSpacing.cardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/lots/${lot.id}'),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Thumbnail
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.asset(
                        lot.imagePath,
                        width: 76,
                        height: 64,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Lot #${lot.lotNumber}',
                                style: PioneerTypography.metadata.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: PioneerColors.brandPurple,
                                ),
                              ),
                              PioneerStatusChip(status: lot.status, isSmall: true),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            lot.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: PioneerTypography.cardTitle.copyWith(fontSize: 13.5),
                          ),
                          const SizedBox(height: 4),
                          if (lot.timeRemaining > Duration.zero)
                            Row(
                              children: [
                                const Icon(Icons.timer_outlined, size: 12, color: PioneerColors.liveRed),
                                const SizedBox(width: 4),
                                Text(
                                  'Ends in: ${PioneerFormatters.countdown(lot.timeRemaining, includeSeconds: false)}',
                                  style: PioneerTypography.metadata.copyWith(
                                    color: PioneerColors.liveRed,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Your Bid', style: PioneerTypography.priceLabel),
                        const SizedBox(height: 2),
                        Text(
                          PioneerFormatters.currency(lot.yourBid ?? lot.currentBid),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: isWinning
                                ? PioneerColors.registeredGreen
                                : isOutbid
                                    ? PioneerColors.liveRed
                                    : PioneerColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Current Bid', style: PioneerTypography.priceLabel),
                        const SizedBox(height: 2),
                        Text(
                          PioneerFormatters.currency(lot.currentBid),
                          style: PioneerTypography.priceMedium.copyWith(fontSize: 14),
                        ),
                      ],
                    ),
                    if (isOutbid)
                      SizedBox(
                        height: 34,
                        child: PioneerButton(
                          label: 'BID AGAIN',
                          variant: PioneerButtonVariant.danger,
                          onPressed: () => context.push('/live-auction/${lot.id}'),
                          isFullWidth: false,
                        ),
                      )
                    else if (isWinning)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: PioneerColors.winningBadgeBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle_rounded, size: 13, color: PioneerColors.winningBadgeText),
                            SizedBox(width: 4),
                            Text(
                              'Highest Bidder',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: PioneerColors.winningBadgeText,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      SizedBox(
                        height: 34,
                        child: PioneerButton(
                          label: 'View Lot',
                          variant: PioneerButtonVariant.outline,
                          onPressed: () => context.push('/lots/${lot.id}'),
                          isFullWidth: false,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
