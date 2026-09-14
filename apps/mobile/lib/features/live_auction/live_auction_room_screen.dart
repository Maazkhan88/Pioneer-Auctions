import 'package:flutter/material.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/bid_model.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import '../../design_system/components/pioneer_slide_to_bid.dart';
import '../../design_system/components/pioneer_status_chip.dart';

class LiveAuctionRoomScreen extends StatefulWidget {
  final String lotId;

  const LiveAuctionRoomScreen({super.key, required this.lotId});

  @override
  State<LiveAuctionRoomScreen> createState() => _LiveAuctionRoomScreenState();
}

class _LiveAuctionRoomScreenState extends State<LiveAuctionRoomScreen> {
  late int _currentBid;
  late int _nextBid;
  late List<BidItem> _bids;
  bool _isUserWinning = true;

  @override
  void initState() {
    super.initState();
    final repo = PioneerMockRepository.instance;
    _currentBid = 86000;
    _nextBid = 87000;
    _bids = List.from(repo.getLiveBids());
  }

  Future<void> _handleBidConfirmed() async {
    // Simulate bid network latency
    await Future.delayed(const Duration(milliseconds: 300));
    setState(() {
      _currentBid = _nextBid;
      _nextBid += 1000;
      _isUserWinning = true;
      _bids.insert(
        0,
        BidItem(
          id: 'bid-${DateTime.now().millisecondsSinceEpoch}',
          bidderNumber: 'Bidder #2456 (You)',
          isCurrentUser: true,
          amount: _currentBid,
          timeAgo: 'Just now',
          lotId: widget.lotId,
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final repo = PioneerMockRepository.instance;
    final lot = repo.getLots().firstWhere(
          (l) => l.id == widget.lotId,
          orElse: () => repo.getLots().first,
        );

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(PioneerSpacing.headerHeight),
        child: Container(
          color: PioneerColors.surface,
          child: SafeArea(
            bottom: false,
            child: Container(
              height: PioneerSpacing.headerHeight,
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: PioneerColors.borderLight, width: 1.0)),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).maybePop(),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: PioneerColors.surfaceSubtle,
                        shape: BoxShape.circle,
                        border: Border.all(color: PioneerColors.border),
                      ),
                      child: const Icon(Icons.arrow_back_rounded, size: 20, color: PioneerColors.textPrimary),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Live Auction Room',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: PioneerColors.textPrimary,
                          ),
                        ),
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              margin: const EdgeInsets.only(right: 5),
                              decoration: const BoxDecoration(
                                color: PioneerColors.registeredGreen,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const Text(
                              'UAE Govt Vehicles • Connected',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: PioneerColors.registeredGreen,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 34,
                    height: 34,
                    decoration: const BoxDecoration(
                      color: PioneerColors.avatarBg,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text(
                        'AA',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Live Stream Media Window
            _buildLiveMediaWindow(lot),
            const SizedBox(height: 12),

            // Lot Header & Quick Metadata
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Lot #${lot.lotNumber}',
                            style: PioneerTypography.metadata.copyWith(
                              fontWeight: FontWeight.w800,
                              color: PioneerColors.brandPurple,
                            ),
                          ),
                          Text(lot.title, style: PioneerTypography.sectionTitle.copyWith(fontSize: 17)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: PioneerColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: PioneerColors.border),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.remove_red_eye_outlined, size: 14, color: PioneerColors.brandPurple),
                            SizedBox(width: 4),
                            Text(
                              'Watching',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: PioneerColors.brandPurple),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Winning State Banner
                  if (_isUserWinning) _buildWinningBanner(),
                  const SizedBox(height: 12),

                  // Bid Status Box (Current Bid, Next Bid, Timer)
                  _buildBidMetricsBox(lot),
                  const SizedBox(height: 16),

                  // Interactive SLIDE TO BID
                  PioneerSlideToBid(
                    bidAmount: _nextBid,
                    onConfirmed: _handleBidConfirmed,
                  ),
                  const SizedBox(height: 20),

                  // Split Section: Live Bidding Stream & Progress / Callout
                  _buildBiddingActivityAndProgress(),
                  const SizedBox(height: 18),

                  // Next Lot Preview
                  _buildNextLotPreview(),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLiveMediaWindow(LotItem lot) {
    return Stack(
      children: [
        AspectRatio(
          aspectRatio: 1.7,
          child: Image.asset(
            lot.imagePath,
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
                  Colors.black.withValues(alpha: 0.5),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.4),
                ],
              ),
            ),
          ),
        ),
        // Live badge top-left
        const Positioned(
          top: 10,
          left: 12,
          child: PioneerStatusChip(status: LotStatus.live),
        ),
        // Watching count top-right
        Positioned(
          top: 10,
          right: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Row(
              children: [
                Icon(Icons.visibility_outlined, size: 12, color: Colors.white),
                SizedBox(width: 4),
                Text(
                  '128 watching',
                  style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ),
        // Lot counter bottom-left
        Positioned(
          bottom: 10,
          left: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text(
              'Lot 118 of 320',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWinningBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: PioneerColors.winningBadgeBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: PioneerColors.winningBadgeText.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.emoji_events_rounded, color: PioneerColors.winningBadgeText, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'YOU\'RE WINNING',
                  style: TextStyle(
                    color: PioneerColors.winningBadgeText,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  'You hold the highest bid at ${PioneerFormatters.currency(_currentBid)}.',
                  style: const TextStyle(
                    color: PioneerColors.winningBadgeText,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBidMetricsBox(LotItem lot) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PioneerColors.surface,
        borderRadius: PioneerSpacing.borderRadiusCard,
        border: Border.all(color: PioneerColors.border),
        boxShadow: PioneerSpacing.cardShadow,
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Current Highest Bid', style: PioneerTypography.priceLabel),
                  const SizedBox(height: 2),
                  Text(
                    PioneerFormatters.currency(_currentBid),
                    style: PioneerTypography.priceLarge.copyWith(fontSize: 24),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Next Bid Required', style: PioneerTypography.priceLabel),
                  const SizedBox(height: 2),
                  Text(
                    PioneerFormatters.currency(_nextBid),
                    style: PioneerTypography.priceMedium.copyWith(fontSize: 18),
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.gavel_rounded, size: 14, color: PioneerColors.brandPurple),
                  const SizedBox(width: 5),
                  Text('34 Bids Placed', style: PioneerTypography.metadata.copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
              Row(
                children: [
                  const Icon(Icons.timer_outlined, size: 14, color: PioneerColors.liveRed),
                  const SizedBox(width: 5),
                  Text(
                    'Closing in: 2h 14m 32s',
                    style: PioneerTypography.metadata.copyWith(
                      color: PioneerColors.liveRed,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBiddingActivityAndProgress() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Auctioneer Callout Card (GOING ONCE)
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: PioneerColors.brandPurpleLight,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: PioneerColors.brandPurple.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: PioneerColors.brandPurple,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.gavel_rounded, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GOING ONCE! at AED 86,000',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: PioneerColors.brandPurple,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Auctioneer is preparing to call Going Twice.',
                      style: TextStyle(
                        fontSize: 11,
                        color: PioneerColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Live Bidding Stream Header
        const Text('Live Bidding Activity', style: PioneerTypography.sectionTitle),
        const SizedBox(height: 8),

        // Stream Items
        Container(
          decoration: BoxDecoration(
            color: PioneerColors.surface,
            borderRadius: PioneerSpacing.borderRadiusCard,
            border: Border.all(color: PioneerColors.border),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _bids.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final bid = _bids[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(right: 8),
                          decoration: BoxDecoration(
                            color: bid.isCurrentUser ? PioneerColors.registeredGreen : PioneerColors.borderMedium,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Text(
                          bid.bidderNumber,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: bid.isCurrentUser ? FontWeight.w800 : FontWeight.w600,
                            color: bid.isCurrentUser ? PioneerColors.registeredGreen : PioneerColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          PioneerFormatters.currency(bid.amount),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: bid.isCurrentUser ? PioneerColors.brandPurple : PioneerColors.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          bid.timeAgo,
                          style: PioneerTypography.metadata.copyWith(fontSize: 10.5),
                        ),
                      ],
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

  Widget _buildNextLotPreview() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: PioneerColors.surface,
        borderRadius: PioneerSpacing.borderRadiusCard,
        border: Border.all(color: PioneerColors.border),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.asset(
              AssetPaths.rangeRover,
              width: 60,
              height: 50,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'UP NEXT • LOT #119',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: PioneerColors.upcomingPurple,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  '2021 Range Rover Sport HSE',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: PioneerColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Starting at AED 140,000 • In ~ 2 min',
                  style: PioneerTypography.metadata.copyWith(fontSize: 10.5),
                ),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: PioneerColors.textMuted),
        ],
      ),
    );
  }
}
