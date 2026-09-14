import 'package:flutter/material.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../core/utils/formatters.dart';
import 'pioneer_status_chip.dart';

class PioneerLotCard extends StatelessWidget {
  final LotItem lot;
  final VoidCallback? onTap;
  final VoidCallback? onWatchlistTap;
  final double? width;
  final bool isHorizontalCard;

  const PioneerLotCard({
    super.key,
    required this.lot,
    this.onTap,
    this.onWatchlistTap,
    this.width,
    this.isHorizontalCard = false,
  });

  @override
  Widget build(BuildContext context) {
    // Determine specs string based on category
    String specsString = '';
    if (lot.category == LotCategory.vehicles) {
      final year = lot.specs['Year'] ?? '';
      final mileage = lot.specs['Mileage'] ?? '';
      specsString = [year, mileage].where((s) => s.isNotEmpty).join(' • ');
    } else if (lot.category == LotCategory.realEstate) {
      final beds = lot.specs['Beds'] ?? '';
      final area = lot.specs['Area'] ?? '';
      specsString = [beds, area].where((s) => s.isNotEmpty).join(' • ');
    } else {
      final power = lot.specs['Power'] ?? lot.specs['Capacity'] ?? lot.specs['Weight'] ?? '';
      final year = lot.specs['Year'] ?? lot.specs['Condition'] ?? '';
      specsString = [power, year].where((s) => s.isNotEmpty).join(' • ');
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final bool hasBoundedHeight = constraints.hasBoundedHeight;

        final detailsWidget = Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Lot number & specs
                  Row(
                    children: [
                      Text(
                        'Lot #${lot.lotNumber}',
                        style: PioneerTypography.metadata.copyWith(
                          fontWeight: FontWeight.w700,
                          color: PioneerColors.brandPurple,
                          fontSize: 10.5,
                        ),
                      ),
                      if (specsString.isNotEmpty) ...[
                        const SizedBox(width: 4),
                        const Text('•', style: TextStyle(fontSize: 10, color: PioneerColors.textMuted)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            specsString,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: PioneerTypography.metadata.copyWith(fontSize: 10.5),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  // Title
                  Text(
                    lot.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: PioneerTypography.cardTitle.copyWith(
                      fontSize: 12.5,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    lot.status == LotStatus.winning ? 'Winning Bid' : 'Current Bid',
                    style: PioneerTypography.priceLabel.copyWith(fontSize: 10.0),
                  ),
                  const SizedBox(height: 1),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      PioneerFormatters.currency(lot.currentBid),
                      style: PioneerTypography.priceMedium.copyWith(
                        fontSize: 14.5,
                        color: lot.status == LotStatus.winning ? PioneerColors.brandPurple : PioneerColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );

        return Container(
          width: width,
          decoration: BoxDecoration(
            color: PioneerColors.surface,
            borderRadius: PioneerSpacing.borderRadiusCard,
            border: Border.all(color: PioneerColors.border, width: 1.0),
            boxShadow: PioneerSpacing.cardShadow,
          ),
          clipBehavior: Clip.antiAlias,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Image with Badges
                  Stack(
                    children: [
                      AspectRatio(
                        aspectRatio: 1.45,
                        child: Image.asset(
                          lot.imagePath,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: PioneerColors.surfaceSubtle,
                            child: const Center(
                              child: Icon(Icons.image_outlined, color: PioneerColors.textMuted),
                            ),
                          ),
                        ),
                      ),
                      // Gradient overlay
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.35),
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.15),
                              ],
                              stops: const [0.0, 0.4, 1.0],
                            ),
                          ),
                        ),
                      ),
                      // Status Badge top-left
                      Positioned(
                        top: 6,
                        left: 6,
                        child: PioneerStatusChip(
                          status: lot.status,
                          isSmall: true,
                        ),
                      ),
                      // Countdown timer top-right
                      if (lot.timeRemaining > Duration.zero)
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.65),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.access_time_rounded,
                                  size: 10,
                                  color: Colors.white,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  PioneerFormatters.countdown(lot.timeRemaining, includeSeconds: false),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      // Watchlist button bottom-right
                      Positioned(
                        bottom: 5,
                        right: 5,
                        child: GestureDetector(
                          onTap: onWatchlistTap,
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.45),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              lot.isWatchlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                              size: 14,
                              color: lot.isWatchlisted ? PioneerColors.liveRed : Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (hasBoundedHeight)
                    Expanded(child: detailsWidget)
                  else
                    detailsWidget,
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
