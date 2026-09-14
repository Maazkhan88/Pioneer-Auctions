import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart' hide State;
import '../../core/bidding/bid_state_machine.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/bid_model.dart';
import '../../core/models/lot_model.dart';
import '../../core/network/api_repository.dart';
import '../../core/network/api_result.dart';
import '../../core/network/socket_events.dart';
import '../../core/network/socket_service.dart';
import '../../core/session/session_service.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import '../../design_system/components/pioneer_button.dart';
import '../../design_system/components/pioneer_slide_to_bid.dart';
import '../../design_system/components/pioneer_status_chip.dart';

class LiveAuctionRoomScreen extends StatefulWidget {
  final String lotId;

  const LiveAuctionRoomScreen({super.key, required this.lotId});

  @override
  State<LiveAuctionRoomScreen> createState() => _LiveAuctionRoomScreenState();
}

class _LiveAuctionRoomScreenState extends State<LiveAuctionRoomScreen> {
  int _currentBid = 86000;
  int _nextBid = 87000;
  late List<BidItem> _bids;
  bool _isUserWinning = false;
  bool _isSubmitting = false;
  final SocketService _socketService = SocketService();
  final BidStateMachine _bidStateMachine = BidStateMachine();
  bool _isSocketConnected = false;
  LotItem? _lot;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    final repo = PioneerMockRepository.instance;
    _bids = List.from(repo.getLiveBids());

    _loadLot();

    // Connect to Socket.IO bidding gateway
    _socketService.addConnectionListener(_onSocketConnectionChanged);
    _socketService.addSnapshotListener(_onSnapshotReceived);
    _socketService.addBidAcceptedListener(_onBidAccepted);
    _socketService.addAuctionExtendedListener(_onAuctionExtended);
    _socketService.addAuctionStateChangedListener(_onAuctionStateChanged);
    _socketService.addMyBidStatusChangedListener(_onMyBidStatusChanged);
    _socketService.addGapDetectedListener(_onGapDetected);

    _socketService.connect();
    _socketService.subscribeToLot(widget.lotId);
  }

  Future<void> _loadLot() async {
    setState(() => _isLoading = true);
    final lot = await PioneerRepository.instance.getLotById(widget.lotId);
    if (mounted) {
      setState(() {
        _lot = lot;
        if (lot != null) {
          _currentBid = lot.currentBid;
          _nextBid = lot.nextBid;
          _isUserWinning = lot.status == LotStatus.winning;
        }
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _socketService.removeConnectionListener(_onSocketConnectionChanged);
    _socketService.removeSnapshotListener(_onSnapshotReceived);
    _socketService.removeBidAcceptedListener(_onBidAccepted);
    _socketService.removeAuctionExtendedListener(_onAuctionExtended);
    _socketService.removeAuctionStateChangedListener(_onAuctionStateChanged);
    _socketService.removeMyBidStatusChangedListener(_onMyBidStatusChanged);
    _socketService.removeGapDetectedListener(_onGapDetected);
    _socketService.unsubscribeFromLot(widget.lotId);
    _socketService.disconnect();
    super.dispose();
  }

  void _onSocketConnectionChanged(bool connected) {
    if (mounted) {
      setState(() {
        _isSocketConnected = connected;
      });
    }
  }

  void _onSnapshotReceived(LotSnapshotEvent event) {
    if (!mounted || event.lotId != widget.lotId) return;
    setState(() {
      if (event.state.currentBid != null) {
        _currentBid = (event.state.currentBid!.amountFils / 100).round();
      }
      _nextBid = (event.state.nextMinimumBid.amountFils / 100).round();
    });
  }

  void _onBidAccepted(BidAcceptedEvent event) {
    if (!mounted || event.lotId != widget.lotId) return;
    final newAmountAed = (event.currentBid.amountFils / 100).round();
    final nextMinAed = (event.nextMinimumBid.amountFils / 100).round();
    setState(() {
      _currentBid = newAmountAed;
      _nextBid = nextMinAed;
      _bids.insert(
        0,
        BidItem(
          id: 'bid-${event.sequence}',
          bidderNumber: 'Bidder',
          isCurrentUser: false,
          amount: newAmountAed,
          timeAgo: 'Just now',
          lotId: widget.lotId,
        ),
      );
    });
    _bidStateMachine.handleExternalBidAccepted(event);
  }

  void _onAuctionExtended(AuctionExtendedEvent event) {
    if (!mounted || event.lotId != widget.lotId) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Auction extended by 2 minutes (Soft-close)'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _onAuctionStateChanged(AuctionStateChangedEvent event) {
    if (!mounted || event.lotId != widget.lotId) return;
    _bidStateMachine.handleAuctionStateChanged(event);
  }

  void _onMyBidStatusChanged(MyBidStatusChangedEvent event) {
    if (!mounted || event.lotId != widget.lotId) return;
    setState(() {
      _isUserWinning = event.status == 'WINNING';
    });
    _bidStateMachine.handleMyBidStatusChanged(event);
  }

  void _onGapDetected(String lotId) {
    if (!mounted || lotId != widget.lotId) return;
    _bidStateMachine.handleGapDetected(lotId);
  }

  Future<void> _handleBidConfirmed() async {
    if (!SessionService.instance.isKycVerified) {
      _bidStateMachine.handleFailure(
        amountFils: _nextBid * 100,
        code: 'KYC_REQUIRED',
        message: 'Identity verification required before placing a bid in live auctions.',
      );
      HapticFeedback.vibrate();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Emirates ID verification required to bid.'),
          backgroundColor: PioneerColors.statusPendingText,
          action: SnackBarAction(
            label: 'Verify ID',
            textColor: Colors.white,
            onPressed: () => context.push('/kyc/verify'),
          ),
        ),
      );
      return;
    }

    _bidStateMachine.startConfirming(
      amountFils: _nextBid * 100,
      expectedSequence: _socketService.getLastAppliedSequence(widget.lotId) ?? 0,
      termsAccepted: true,
    );
    final commandId = _bidStateMachine.startSubmitting();
    if (commandId == null) return;

    setState(() => _isSubmitting = true);

    if (_socketService.isConnected) {
      final outcome = await _socketService.placeBid(
        lotId: widget.lotId,
        amountFils: _nextBid * 100,
        commandId: commandId,
        expectedSequence: _socketService.getLastAppliedSequence(widget.lotId) ?? 0,
      );

      if (outcome is SocketCommandSuccess<CommandAck>) {
        _bidStateMachine.handleCommandAck(outcome.data, amountFils: _nextBid * 100);
        HapticFeedback.heavyImpact();
        if (mounted) {
          setState(() {
            _isSubmitting = false;
            _isUserWinning = outcome.data.result?.myBidStatus == MyBidStatus.WINNING;
            _currentBid = _nextBid;
            _nextBid = _nextBid + 1000;
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
      } else if (outcome is SocketCommandFailure<CommandAck>) {
        _bidStateMachine.handleFailure(
          amountFils: _nextBid * 100,
          code: outcome.code,
          message: outcome.message,
          retryable: outcome.retryable,
          latest: outcome.latest,
        );
        HapticFeedback.vibrate();
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(outcome.message),
              backgroundColor: PioneerColors.liveRed,
            ),
          );
        }
      } else if (outcome is SocketCommandUnknown<CommandAck>) {
        _bidStateMachine.handleUnknown(
          amountFils: _nextBid * 100,
          commandId: outcome.commandId,
          message: outcome.message,
        );
        HapticFeedback.vibrate();
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(outcome.message),
              backgroundColor: PioneerColors.orangeEndingSoon,
            ),
          );
        }
      } else {
        setState(() => _isSubmitting = false);
      }
    } else {
      // Fallback: Use live REST API path
      final result = await PioneerRepository.instance.placeBid(
        lotId: widget.lotId,
        amountFils: _nextBid * 100,
        commandId: commandId,
      );

      if (result is ApiSuccess<CommandAck>) {
        _bidStateMachine.handleCommandAck(result.data, amountFils: _nextBid * 100);
        HapticFeedback.heavyImpact();
        if (mounted) {
          setState(() {
            _isSubmitting = false;
            _isUserWinning = result.data.result?.myBidStatus == MyBidStatus.WINNING;
            _currentBid = _nextBid;
            _nextBid = _nextBid + 1000;
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
      } else if (result is ApiFailure<CommandAck>) {
        _bidStateMachine.handleFailure(
          amountFils: _nextBid * 100,
          code: result.code,
          message: result.message,
          retryable: result.retryable,
          latest: result.latest,
        );
        HapticFeedback.vibrate();
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: PioneerColors.liveRed,
            ),
          );
        }
      } else if (result is ApiUnknown<CommandAck>) {
        _bidStateMachine.handleUnknown(
          amountFils: _nextBid * 100,
          commandId: commandId,
          message: result.message,
        );
        HapticFeedback.vibrate();
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: PioneerColors.orangeEndingSoon,
            ),
          );
        }
      } else {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: PioneerColors.background,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(PioneerColors.brandPurple),
          ),
        ),
      );
    }

    final lot = _lot;
    if (lot == null) {
      return Scaffold(
        backgroundColor: PioneerColors.background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.search_off_rounded, size: 64, color: PioneerColors.textMuted),
                const SizedBox(height: 16),
                Text('Lot Not Found', style: PioneerTypography.sectionTitle),
                const SizedBox(height: 8),
                Text(
                  'Lot #${widget.lotId} could not be found or has ended.',
                  style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                PioneerButton(
                  label: 'Back to Browse',
                  onPressed: () => context.go('/browse'),
                  isLarge: false,
                  isFullWidth: false,
                ),
              ],
            ),
          ),
        ),
      );
    }

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
                              decoration: BoxDecoration(
                                color: _isSocketConnected ? PioneerColors.registeredGreen : PioneerColors.brandOrange,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Text(
                              _isSocketConnected ? 'UAE Govt Vehicles • Live Gateway' : 'UAE Govt Vehicles • Local Standby',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: _isSocketConnected ? PioneerColors.registeredGreen : PioneerColors.brandOrange,
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
                    isSubmitting: _isSubmitting,
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
