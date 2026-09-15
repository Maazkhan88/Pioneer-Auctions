import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_lot_card.dart';
import '../../design_system/components/pioneer_search_field.dart';
import '../../core/network/api_repository.dart';

class BrowseLotsScreen extends StatefulWidget {
  final LotCategory? initialCategory;

  const BrowseLotsScreen({super.key, this.initialCategory});

  @override
  State<BrowseLotsScreen> createState() => _BrowseLotsScreenState();
}

class _BrowseLotsScreenState extends State<BrowseLotsScreen> {
  String _selectedCategory = 'All';
  String _searchQuery = '';
  String _sortBy = 'Ending Soon';
  List<LotItem> _allLots = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null) {
      switch (widget.initialCategory!) {
        case LotCategory.vehicles:
          _selectedCategory = 'Vehicles';
          break;
        case LotCategory.realEstate:
          _selectedCategory = 'Real Estate';
          break;
        case LotCategory.generalMaterials:
          _selectedCategory = 'General Materials';
          break;
      }
    }
    _loadLots();
  }

  Future<void> _loadLots() async {
    setState(() => _isLoading = true);
    final lots = await PioneerRepository.instance.getLots();
    if (mounted) {
      setState(() {
        _allLots = lots;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredLots = _allLots.where((lot) {
      if (_selectedCategory == 'Vehicles' && lot.category != LotCategory.vehicles) return false;
      if (_selectedCategory == 'Real Estate' && lot.category != LotCategory.realEstate) return false;
      if (_selectedCategory == 'General Materials' && lot.category != LotCategory.generalMaterials) return false;
      if (_searchQuery.isNotEmpty && !lot.title.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: const PioneerAppHeader(
        isRoot: false,
        title: 'Browse Lots',
        subtitle: 'Discover great deals across all categories',
      ),
      body: RefreshIndicator(
        onRefresh: _loadLots,
        color: PioneerColors.brandPurple,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 12),
                    PioneerSearchField(
                      hintText: 'Search lots...',
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                    const SizedBox(height: 14),
                    // Category Filter Pills
                    _buildCategoryFilterPills(),
                    const SizedBox(height: 14),
                    // Sort & Count Bar
                    _buildSortBar(filteredLots.length),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(PioneerColors.brandPurple),
                  ),
                ),
              )
            else if (filteredLots.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.inventory_2_outlined, size: 56, color: PioneerColors.textMuted),
                        const SizedBox(height: 12),
                        Text('No Lots Found', style: PioneerTypography.sectionTitle),
                        const SizedBox(height: 6),
                        Text(
                          'No lots match your current search or category filter.',
                          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              // 2-Column Grid
              SliverPadding(
                padding: const EdgeInsets.only(
                  left: PioneerSpacing.pageMargin,
                  right: PioneerSpacing.pageMargin,
                  bottom: PioneerSpacing.floatingNavClearance,
                ),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: PioneerSpacing.cardGutterV,
                    crossAxisSpacing: PioneerSpacing.cardGutterH,
                    childAspectRatio: 0.65,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final lot = filteredLots[index];
                      return PioneerLotCard(
                        lot: lot,
                        onTap: () => context.push('/lots/${lot.id}'),
                      );
                    },
                    childCount: filteredLots.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryFilterPills() {
    final categories = [
      {'name': 'All', 'icon': Icons.grid_view_rounded},
      {'name': 'Vehicles', 'icon': Icons.directions_car_rounded},
      {'name': 'Real Estate', 'icon': Icons.apartment_rounded},
      {'name': 'General Materials', 'icon': Icons.precision_manufacturing_rounded},
      {'name': 'Equipment', 'icon': Icons.build_rounded},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: categories.map((cat) {
          final isSelected = _selectedCategory == cat['name'];
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: GestureDetector(
              onTap: () => setState(() => _selectedCategory = cat['name'] as String),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? PioneerColors.brandPurple : PioneerColors.surface,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isSelected ? PioneerColors.brandPurple : PioneerColors.border,
                    width: 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      cat['icon'] as IconData,
                      size: 14,
                      color: isSelected ? Colors.white : PioneerColors.textSecondary,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      cat['name'] as String,
                      style: PioneerTypography.chipLabel.copyWith(
                        color: isSelected ? Colors.white : PioneerColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSortBar(int count) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          '$count Lots Available',
          style: PioneerTypography.metadata.copyWith(
            fontWeight: FontWeight.w700,
            color: PioneerColors.textPrimary,
          ),
        ),
        PopupMenuButton<String>(
          initialValue: _sortBy,
          onSelected: (val) => setState(() => _sortBy = val),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: PioneerColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: PioneerColors.border),
            ),
            child: Row(
              children: [
                Text(
                  'Sort by: $_sortBy',
                  style: PioneerTypography.metadata.copyWith(
                    fontWeight: FontWeight.w600,
                    color: PioneerColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: PioneerColors.textSecondary),
              ],
            ),
          ),
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'Ending Soon', child: Text('Ending Soon')),
            const PopupMenuItem(value: 'Price: Low to High', child: Text('Price: Low to High')),
            const PopupMenuItem(value: 'Price: High to Low', child: Text('Price: High to Low')),
            const PopupMenuItem(value: 'Newest Listed', child: Text('Newest Listed')),
          ],
        ),
      ],
    );
  }
}
