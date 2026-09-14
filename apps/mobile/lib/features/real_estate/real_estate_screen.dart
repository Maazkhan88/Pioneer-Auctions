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

class RealEstateScreen extends StatefulWidget {
  const RealEstateScreen({super.key});

  @override
  State<RealEstateScreen> createState() => _RealEstateScreenState();
}

class _RealEstateScreenState extends State<RealEstateScreen> {
  String _selectedPropertyType = 'All';
  String _searchQuery = '';
  List<LotItem> _realEstateLots = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLots();
  }

  Future<void> _loadLots() async {
    setState(() => _isLoading = true);
    final lots = await PioneerRepository.instance.getLots(category: LotCategory.realEstate);
    if (mounted) {
      setState(() {
        _realEstateLots = lots;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredLots = _realEstateLots.where((lot) {
      if (_selectedPropertyType == 'Villas' && !lot.title.toLowerCase().contains('villa')) return false;
      if (_selectedPropertyType == 'Apartments' && !lot.title.toLowerCase().contains('apartment')) return false;
      if (_selectedPropertyType == 'Warehouses' && !lot.title.toLowerCase().contains('warehouse')) return false;
      if (_selectedPropertyType == 'Commercial' && !lot.title.toLowerCase().contains('office') && !lot.title.toLowerCase().contains('commercial')) return false;
      if (_selectedPropertyType == 'Land' && !lot.title.toLowerCase().contains('land')) return false;
      if (_searchQuery.isNotEmpty && !lot.title.toLowerCase().contains(_searchQuery.toLowerCase()) && !lot.location.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: PioneerAppHeader(
        isRoot: false,
        title: 'Real Estate',
        subtitle: 'Residential, Commercial & Land Across UAE • ${_realEstateLots.length} Lots',
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
                    hintText: 'Search by location, property type, community...',
                    onChanged: (val) => setState(() => _searchQuery = val),
                  ),
                  const SizedBox(height: 14),
                  // Property Type Selector
                  _buildPropertyTypeSelector(),
                  const SizedBox(height: 14),
                  // Count Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${filteredLots.length} Properties Available',
                        style: PioneerTypography.metadata.copyWith(
                          fontWeight: FontWeight.w700,
                          color: PioneerColors.textPrimary,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: PioneerColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: PioneerColors.border),
                        ),
                        child: const Row(
                          children: [
                            Text(
                              'Sort: Ending Soon',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: PioneerColors.textPrimary,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: PioneerColors.textSecondary),
                          ],
                        ),
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

  Widget _buildPropertyTypeSelector() {
    final types = [
      {'name': 'All', 'icon': Icons.home_work_rounded},
      {'name': 'Villas', 'icon': Icons.villa_rounded},
      {'name': 'Apartments', 'icon': Icons.apartment_rounded},
      {'name': 'Commercial', 'icon': Icons.business_rounded},
      {'name': 'Warehouses', 'icon': Icons.warehouse_rounded},
      {'name': 'Land', 'icon': Icons.terrain_rounded},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: types.map((item) {
          final isSelected = _selectedPropertyType == item['name'];
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: GestureDetector(
              onTap: () => setState(() => _selectedPropertyType = item['name'] as String),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? PioneerColors.brandPurple : PioneerColors.surface,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isSelected ? PioneerColors.brandPurple : PioneerColors.border,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      item['icon'] as IconData,
                      size: 14,
                      color: isSelected ? Colors.white : PioneerColors.textSecondary,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      item['name'] as String,
                      style: PioneerTypography.chipLabel.copyWith(
                        color: isSelected ? Colors.white : PioneerColors.textSecondary,
                        fontSize: 11.5,
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
}
