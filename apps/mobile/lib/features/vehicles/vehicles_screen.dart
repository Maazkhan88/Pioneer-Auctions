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

class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  String _selectedMake = 'All Makes';
  String _searchQuery = '';
  bool _filtersExpanded = false;
  String _sortBy = 'Latest';
  List<LotItem> _vehicleLots = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLots();
  }

  Future<void> _loadLots() async {
    setState(() => _isLoading = true);
    final lots = await PioneerRepository.instance.getLots(category: LotCategory.vehicles);
    if (mounted) {
      setState(() {
        _vehicleLots = lots;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredLots = _vehicleLots.where((lot) {
      if (_selectedMake != 'All Makes' && !lot.title.toLowerCase().contains(_selectedMake.toLowerCase())) {
        return false;
      }
      if (_searchQuery.isNotEmpty && !lot.title.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    filteredLots.sort((a, b) {
      switch (_sortBy) {
        case 'Price: Low to High':
          return a.currentBid.compareTo(b.currentBid);
        case 'Price: High to Low':
          return b.currentBid.compareTo(a.currentBid);
        case 'Ending Soon':
          return a.timeRemaining.compareTo(b.timeRemaining);
        case 'Latest':
        default:
          return b.id.compareTo(a.id);
      }
    });

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: PioneerAppHeader(
        isRoot: false,
        title: 'Vehicles',
        subtitle: 'Cars, Trucks, Buses & More • ${_vehicleLots.length} Lots',
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  PioneerSearchField(
                    hintText: 'Search by make, model, or keyword...',
                    onChanged: (val) => setState(() => _searchQuery = val),
                    onFilterTap: () => setState(() => _filtersExpanded = !_filtersExpanded),
                  ),
                  const SizedBox(height: 12),
                  // Filter Chips Row
                  _buildQuickFilters(),
                  if (_filtersExpanded) ...[
                    const SizedBox(height: 12),
                    _buildExpandedFilterPanel(),
                  ],
                  const SizedBox(height: 14),
                  // Count and Sort
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${filteredLots.length} Vehicles Available',
                        style: PioneerTypography.metadata.copyWith(
                          fontWeight: FontWeight.w700,
                          color: PioneerColors.textPrimary,
                        ),
                      ),
                      PopupMenuButton<String>(
                        initialValue: _sortBy,
                        onSelected: (val) => setState(() => _sortBy = val),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: PioneerColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: PioneerColors.border),
                          ),
                          child: Row(
                            children: [
                              Text(
                                'Sort: $_sortBy',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: PioneerColors.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: PioneerColors.textSecondary),
                            ],
                          ),
                        ),
                        itemBuilder: (context) => [
                          const PopupMenuItem(value: 'Latest', child: Text('Latest')),
                          const PopupMenuItem(value: 'Price: Low to High', child: Text('Price: Low to High')),
                          const PopupMenuItem(value: 'Price: High to Low', child: Text('Price: High to Low')),
                          const PopupMenuItem(value: 'Ending Soon', child: Text('Ending Soon')),
                        ],
                      ),
                    ],
                  ),
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
          else
            // 2-Column Grid
            SliverPadding(
            padding: const EdgeInsets.only(
              left: PioneerSpacing.pageMargin,
              right: PioneerSpacing.pageMargin,
              bottom: 24,
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
    );
  }

  Widget _buildQuickFilters() {
    final makes = ['All Makes', 'BMW', 'Mercedes-Benz', 'Toyota', 'Land Rover', 'MAN'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: makes.map((make) {
          final isSelected = _selectedMake == make;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: GestureDetector(
              onTap: () => setState(() => _selectedMake = make),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? PioneerColors.brandPurple : PioneerColors.surface,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isSelected ? PioneerColors.brandPurple : PioneerColors.border,
                  ),
                ),
                child: Text(
                  make,
                  style: PioneerTypography.chipLabel.copyWith(
                    color: isSelected ? Colors.white : PioneerColors.textSecondary,
                    fontSize: 11.5,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildExpandedFilterPanel() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PioneerColors.surface,
        borderRadius: PioneerSpacing.borderRadiusCard,
        border: Border.all(color: PioneerColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Filter by Specifications', style: PioneerTypography.sectionTitle),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _buildFilterDropdown('Year', ['2024', '2023', '2022', '2021', 'Older'])),
              const SizedBox(width: 10),
              Expanded(child: _buildFilterDropdown('Transmission', ['Automatic', 'Manual'])),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _buildFilterDropdown('Mileage', ['< 50k km', '< 100k km', '100k+ km'])),
              const SizedBox(width: 10),
              Expanded(child: _buildFilterDropdown('Fuel', ['Petrol', 'Diesel', 'Hybrid', 'Electric'])),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterDropdown(String label, List<String> options) {
    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: PioneerColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: PioneerColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: PioneerColors.textSecondary, fontWeight: FontWeight.w600),
          ),
          const Icon(Icons.arrow_drop_down_rounded, color: PioneerColors.textSecondary),
        ],
      ),
    );
  }
}
