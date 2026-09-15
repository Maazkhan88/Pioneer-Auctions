import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/auction_model.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_auction_card.dart';
import '../../design_system/components/pioneer_search_field.dart';

class AuctionsScreen extends StatefulWidget {
  const AuctionsScreen({super.key});

  @override
  State<AuctionsScreen> createState() => _AuctionsScreenState();
}

class _AuctionsScreenState extends State<AuctionsScreen> {
  AuctionStatus _selectedStatus = AuctionStatus.live;
  String _selectedCategory = 'ALL';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final repo = PioneerMockRepository.instance;
    final allAuctions = repo.getAuctions();

    final liveCount = allAuctions.where((a) => a.status == AuctionStatus.live).length;
    final upcomingCount = allAuctions.where((a) => a.status == AuctionStatus.upcoming).length;
    final pastCount = allAuctions.where((a) => a.status == AuctionStatus.past).length;

    final filteredAuctions = allAuctions.where((a) {
      if (a.status != _selectedStatus) return false;
      if (_selectedCategory == 'VEHICLES' && a.category != LotCategory.vehicles) return false;
      if (_selectedCategory == 'REAL ESTATE' && a.category != LotCategory.realEstate) return false;
      if (_selectedCategory == 'GENERAL MATERIALS' && a.category != LotCategory.generalMaterials) return false;
      if (_searchQuery.isNotEmpty && !a.title.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: const PioneerAppHeader(isRoot: true),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  const Text('Auctions', style: PioneerTypography.displayTitle),
                  const SizedBox(height: 12),
                  PioneerSearchField(
                    hintText: 'Search auctions, categories, locations...',
                    onChanged: (val) => setState(() => _searchQuery = val),
                  ),
                  const SizedBox(height: 16),
                  // Time Tabs
                  _buildTimeSegmentedControl(liveCount, upcomingCount, pastCount),
                  const SizedBox(height: 14),
                  // Category Filter Chips
                  _buildCategoryChips(),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          // Auctions List
          if (filteredAuctions.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text(
                  'No auctions found matching criteria.',
                  style: PioneerTypography.body,
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.only(
                left: PioneerSpacing.pageMargin,
                right: PioneerSpacing.pageMargin,
                bottom: PioneerSpacing.floatingNavClearance,
              ),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final auction = filteredAuctions[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: PioneerAuctionCard(
                        auction: auction,
                        onTap: () {
                          if (auction.status == AuctionStatus.live) {
                            context.push('/live-auction/lot-118');
                          } else {
                            context.push('/browse');
                          }
                        },
                      ),
                    );
                  },
                  childCount: filteredAuctions.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTimeSegmentedControl(int liveCount, int upcomingCount, int pastCount) {
    return Container(
      height: 42,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: PioneerColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: PioneerColors.border, width: 1.0),
      ),
      child: Row(
        children: [
          _buildTimeTab('LIVE ($liveCount)', AuctionStatus.live),
          _buildTimeTab('UPCOMING ($upcomingCount)', AuctionStatus.upcoming),
          _buildTimeTab('PAST ($pastCount)', AuctionStatus.past),
        ],
      ),
    );
  }

  Widget _buildTimeTab(String title, AuctionStatus status) {
    final bool isSelected = _selectedStatus == status;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedStatus = status),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? PioneerColors.brandPurple : Colors.transparent,
            borderRadius: BorderRadius.circular(7),
          ),
          child: Center(
            child: Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : PioneerColors.textSecondary,
                fontSize: 12.0,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChips() {
    final categories = ['ALL', 'VEHICLES', 'REAL ESTATE', 'GENERAL MATERIALS'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: categories.map((cat) {
          final isSelected = _selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: FilterChip(
              label: Text(cat),
              selected: isSelected,
              showCheckmark: false,
              backgroundColor: PioneerColors.surface,
              selectedColor: PioneerColors.brandPurple,
              labelStyle: PioneerTypography.chipLabel.copyWith(
                color: isSelected ? Colors.white : PioneerColors.textSecondary,
                fontSize: 11.5,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
                side: BorderSide(
                  color: isSelected ? PioneerColors.brandPurple : PioneerColors.border,
                ),
              ),
              onSelected: (_) => setState(() => _selectedCategory = cat),
            ),
          );
        }).toList(),
      ),
    );
  }
}
