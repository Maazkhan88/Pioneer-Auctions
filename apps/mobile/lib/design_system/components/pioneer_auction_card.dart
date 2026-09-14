import 'package:flutter/material.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/models/auction_model.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import 'pioneer_button.dart';
import 'pioneer_status_chip.dart';

class PioneerAuctionCard extends StatelessWidget {
  final AuctionItem auction;
  final VoidCallback? onTap;
  final VoidCallback? onActionTap;

  const PioneerAuctionCard({
    super.key,
    required this.auction,
    this.onTap,
    this.onActionTap,
  });

  @override
  Widget build(BuildContext context) {
    String categoryLabel = '';
    switch (auction.category) {
      case LotCategory.vehicles:
        categoryLabel = 'VEHICLES';
        break;
      case LotCategory.realEstate:
        categoryLabel = 'REAL ESTATE';
        break;
      case LotCategory.generalMaterials:
        categoryLabel = 'GENERAL MATERIALS';
        break;
    }

    String actionButtonLabel = 'View Auction >';
    PioneerButtonVariant buttonVariant = PioneerButtonVariant.primary;
    if (auction.status == AuctionStatus.live) {
      actionButtonLabel = 'Join Live >';
      buttonVariant = PioneerButtonVariant.primary;
    } else if (auction.status == AuctionStatus.upcoming) {
      actionButtonLabel = auction.isRegistered ? 'View Auction >' : 'Register >';
      buttonVariant = auction.isRegistered ? PioneerButtonVariant.secondary : PioneerButtonVariant.primary;
    } else {
      actionButtonLabel = 'View Results >';
      buttonVariant = PioneerButtonVariant.outline;
    }

    return Container(
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
              // Image Header with overlay badges
              Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 2.3,
                    child: Image.asset(
                      auction.imagePath,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: PioneerColors.surfaceSubtle,
                        child: const Center(
                          child: Icon(Icons.image_outlined, color: PioneerColors.textMuted),
                        ),
                      ),
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
                            Colors.black.withValues(alpha: 0.2),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    left: 12,
                    child: Row(
                      children: [
                        if (auction.status == AuctionStatus.live)
                          const PioneerStatusChip(status: LotStatus.live)
                        else if (auction.status == AuctionStatus.upcoming)
                          const PioneerStatusChip(status: LotStatus.upcoming)
                        else
                          const PioneerStatusChip(
                            customLabel: 'PAST',
                            customBg: PioneerColors.pastGrey,
                            customTextColor: PioneerColors.textSecondary,
                          ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            categoryLabel,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (auction.watchingCount > 0)
                    Positioned(
                      top: 10,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.visibility_outlined, size: 12, color: Colors.white),
                            const SizedBox(width: 4),
                            Text(
                              '${auction.watchingCount}',
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
              // Body Information
              Padding(
                padding: const EdgeInsets.all(14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      auction.title,
                      style: PioneerTypography.sectionTitle.copyWith(fontSize: 16),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_outlined, size: 13, color: PioneerColors.textMuted),
                        const SizedBox(width: 5),
                        Text(
                          auction.dateString,
                          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 13, color: PioneerColors.textMuted),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            auction.location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: PioneerColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: PioneerColors.borderLight),
                          ),
                          child: Text(
                            '${auction.lotCount} Lots',
                            style: PioneerTypography.metadata.copyWith(
                              fontWeight: FontWeight.w700,
                              color: PioneerColors.brandPurple,
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 140,
                          height: 36,
                          child: PioneerButton(
                            label: actionButtonLabel,
                            variant: buttonVariant,
                            onPressed: onActionTap ?? onTap,
                            isFullWidth: false,
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
      ),
    );
  }
}
