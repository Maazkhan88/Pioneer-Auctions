import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart' hide State;
import '../../core/bidding/bid_state_machine.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/localization/pioneer_localizations.dart';
import '../../core/models/lot_model.dart';
import '../../core/network/api_repository.dart';
import '../../core/network/api_result.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_button.dart';
import '../../design_system/components/pioneer_status_chip.dart';
import 'components/bid_confirmation_sheet.dart';

class LotDetailScreen extends StatefulWidget {
  final String lotId;

  const LotDetailScreen({super.key, required this.lotId});

  @override
  State<LotDetailScreen> createState() => _LotDetailScreenState();
}

class _LotDetailScreenState extends State<LotDetailScreen> {
  int _currentImageIndex = 0;
  bool _isWatchlisted = true;
  final Set<String> _expandedSections = {'Overview', 'Auction Information'};
  LotItem? _lot;
  bool _isLoading = true;
  final BidStateMachine _bidStateMachine = BidStateMachine();

  @override
  void initState() {
    super.initState();
    _loadLot();
  }

  Future<void> _loadLot() async {
    setState(() => _isLoading = true);
    final lot = await PioneerRepository.instance.getLotById(widget.lotId);
    if (mounted) {
      setState(() {
        _lot = lot;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: PioneerColors.background,
        appBar: const PioneerAppHeader(isRoot: false, showLogoInCenter: true),
        body: const Center(
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
        appBar: const PioneerAppHeader(isRoot: false, showLogoInCenter: true),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.search_off_rounded, size: 64, color: PioneerColors.textMuted),
                const SizedBox(height: 16),
                Text(
                  'Lot Not Found',
                  style: PioneerTypography.sectionTitle,
                ),
                const SizedBox(height: 8),
                Text(
                  'Lot #${widget.lotId} could not be found or has been removed.',
                  style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                PioneerButton(
                  label: 'Browse All Lots',
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

    final thumbnails = [
      AssetPaths.bmwX5Hero,
      AssetPaths.bmwX5Thumb1,
      AssetPaths.bmwX5Thumb2,
      AssetPaths.bmwX5Thumb3,
      AssetPaths.bmwX5Thumb4,
      AssetPaths.bmwX5Thumb5,
    ];

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: PioneerAppHeader(
        isRoot: false,
        showLogoInCenter: true,
        actions: [
          IconButton(
            icon: Icon(
              _isWatchlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: _isWatchlisted ? PioneerColors.liveRed : PioneerColors.textPrimary,
              size: 22,
            ),
            onPressed: () => setState(() => _isWatchlisted = !_isWatchlisted),
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined, color: PioneerColors.textPrimary, size: 22),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Gallery Carousel
                  _buildHeroGallery(thumbnails),
                  const SizedBox(height: 10),
                  // Thumbnails Row
                  _buildThumbnailsRow(thumbnails),
                  const SizedBox(height: 16),

                  // Lot Identification & Title Block
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Breadcrumbs
                        Text(
                          'Auctions > UAE Govt Vehicles > Lot #${lot.lotNumber}',
                          style: PioneerTypography.metadata.copyWith(
                            color: PioneerColors.brandPurple,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Lot #${lot.lotNumber}', style: PioneerTypography.sectionTitle),
                            PioneerStatusChip(status: lot.status),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(lot.title, style: PioneerTypography.displayTitle.copyWith(fontSize: 22)),
                        const SizedBox(height: 16),

                        // Bidding Information Card
                        _buildBiddingCard(lot),
                        const SizedBox(height: 16),

                        // Specs Strip (Year, Mileage, Engine, Transmission)
                        _buildSpecsStrip(lot),
                        const SizedBox(height: 20),

                        // Expandable Sections (Accordions)
                        _buildAccordion('Overview', lot.overviewDescription ?? 'High-specification asset with full service history and authentic documentation.'),
                        _buildAccordion('Condition & Inspection Report', 'Certified Grade A inspection. Engine, transmission, chassis, and electronic control modules inspected with 100% functionality score.'),
                        _buildAccordion('Documents & Certifications', 'Mulkiya registration copy, RTA passing certificate, Pioneer clear title warranty, and inspection report PDF ready for download.'),
                        _buildAccordion('Auction Information', 'Auction: UAE Government Vehicles Auction\nLocation: Dubai Festival City\nClosing Date: Today\nDeposit Required: AED 20,000 (Refundable)'),
                        _buildAccordion('Terms & Conditions', '10% Buyer\'s Premium applies. Payment must be completed within 48 hours of auction closing. Vehicle collection within 5 business days.'),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Sticky Bottom CTA Bar
          _buildStickyCtaBar(context, lot),
        ],
      ),
    );
  }

  Widget _buildHeroGallery(List<String> images) {
    return Stack(
      children: [
        AspectRatio(
          aspectRatio: 1.5,
          child: Image.asset(
            images[_currentImageIndex % images.length],
            fit: BoxFit.cover,
          ),
        ),
        // Photo counter
        Positioned(
          bottom: 12,
          right: 14,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '${_currentImageIndex + 1} / 10',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildThumbnailsRow(List<String> images) {
    return SizedBox(
      height: 54,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
        scrollDirection: Axis.horizontal,
        itemCount: images.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final isSelected = _currentImageIndex == index;
          return GestureDetector(
            onTap: () => setState(() => _currentImageIndex = index),
            child: Container(
              width: 68,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected ? PioneerColors.brandPurple : PioneerColors.border,
                  width: isSelected ? 2.0 : 1.0,
                ),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.asset(images[index], fit: BoxFit.cover),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBiddingCard(LotItem lot) {
    return Container(
      padding: const EdgeInsets.all(16),
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
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    margin: const EdgeInsets.only(right: 6),
                    decoration: const BoxDecoration(
                      color: PioneerColors.liveRed,
                      shape: BoxShape.circle,
                    ),
                  ),
                  Text(
                    'LIVE AUCTION',
                    style: PioneerTypography.badgeText.copyWith(
                      color: PioneerColors.liveRed,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  const Icon(Icons.timer_outlined, size: 14, color: PioneerColors.liveRed),
                  const SizedBox(width: 4),
                  Text(
                    'Time Left: ${PioneerFormatters.countdown(lot.timeRemaining)}',
                    style: PioneerTypography.metadata.copyWith(
                      color: PioneerColors.liveRed,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Current Bid', style: PioneerTypography.priceLabel),
                  const SizedBox(height: 2),
                  Text(
                    PioneerFormatters.currency(lot.currentBid),
                    style: PioneerTypography.priceLarge,
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Next Minimum Bid', style: PioneerTypography.priceLabel),
                  const SizedBox(height: 2),
                  Text(
                    PioneerFormatters.currency(lot.nextBid),
                    style: PioneerTypography.priceMedium.copyWith(
                      color: PioneerColors.textSecondary,
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

  Widget _buildSpecsStrip(LotItem lot) {
    final specs = [
      {'label': 'Year', 'val': lot.specs['Year'] ?? '2022'},
      {'label': 'Mileage', 'val': lot.specs['Mileage'] ?? '42,000 km'},
      {'label': 'Engine', 'val': lot.specs['Engine'] ?? '3.0L I6'},
      {'label': 'Transmission', 'val': lot.specs['Transmission'] ?? 'Automatic'},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: PioneerColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: PioneerColors.borderLight),
      ),
      child: Row(
        children: specs.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  right: index < specs.length - 1
                      ? const BorderSide(color: PioneerColors.border, width: 1.0)
                      : BorderSide.none,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    item['label']!,
                    style: PioneerTypography.metadata.copyWith(fontSize: 10.5),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item['val']!,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: PioneerColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAccordion(String title, String content) {
    final isExpanded = _expandedSections.contains(title);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: PioneerColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: PioneerColors.border),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedSections.remove(title);
                } else {
                  _expandedSections.add(title);
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              color: Colors.transparent,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: PioneerColors.textPrimary,
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: PioneerColors.textSecondary,
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(14.0),
              child: Text(
                content,
                style: PioneerTypography.body.copyWith(
                  height: 1.45,
                  color: PioneerColors.textSecondary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStickyCtaBar(BuildContext context, LotItem lot) {
    final l10n = context.l10n;
    return Container(
      padding: const EdgeInsets.all(PioneerSpacing.pageMargin),
      decoration: const BoxDecoration(
        color: PioneerColors.surface,
        border: Border(top: BorderSide(color: PioneerColors.border, width: 1.0)),
        boxShadow: PioneerSpacing.bottomNavShadow,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: PioneerButton(
                label: l10n.liveAuction,
                variant: PioneerButtonVariant.outline,
                isLarge: true,
                leadingIcon: Icons.videocam_rounded,
                onPressed: () => context.push('/live-auction/${lot.id}'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PioneerButton(
                label: '${l10n.placeBid} \u202A${PioneerFormatters.currency(lot.nextBid)}\u202C',
                isLarge: true,
                leadingIcon: Icons.gavel_rounded,
                onPressed: () => _openBidConfirmationSheet(lot),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openBidConfirmationSheet(LotItem lot) {
    _bidStateMachine.startConfirming(
      amountFils: lot.nextBid * 100,
      expectedSequence: 0,
      termsAccepted: true,
    );

    BidConfirmationSheet.show(
      context: context,
      lotTitle: lot.title,
      bidAmountFils: lot.nextBid * 100,
      stateMachine: _bidStateMachine,
      onSubmit: () async {
        final commandId = _bidStateMachine.startSubmitting();
        if (commandId == null) return;

        final result = await PioneerRepository.instance.placeBid(
          lotId: lot.id,
          amountFils: lot.nextBid * 100,
          commandId: commandId,
        );

        if (result is ApiSuccess<CommandAck>) {
          _bidStateMachine.handleCommandAck(result.data, amountFils: lot.nextBid * 100);
          HapticFeedback.heavyImpact();
          if (mounted) {
            setState(() {
              _lot = _lot?.copyWith(
                currentBid: lot.nextBid,
                nextBid: lot.nextBid + 1000,
                status: LotStatus.winning,
              );
            });
          }
        } else if (result is ApiFailure<CommandAck>) {
          _bidStateMachine.handleFailure(
            amountFils: lot.nextBid * 100,
            code: result.code,
            message: result.message,
            retryable: result.retryable,
            latest: result.latest,
          );
          HapticFeedback.vibrate();
        } else if (result is ApiUnknown<CommandAck>) {
          _bidStateMachine.handleUnknown(
            amountFils: lot.nextBid * 100,
            commandId: commandId,
            message: result.message,
          );
          HapticFeedback.vibrate();
        }
      },
    );
  }
}
