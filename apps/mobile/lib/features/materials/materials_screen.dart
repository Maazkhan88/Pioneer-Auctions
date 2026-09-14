import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/asset_paths.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/data/pioneer_mock_repository.dart';
import '../../core/models/lot_model.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../design_system/components/pioneer_app_header.dart';
import '../../design_system/components/pioneer_lot_card.dart';
import '../../design_system/components/pioneer_search_field.dart';

class MaterialsScreen extends StatefulWidget {
  const MaterialsScreen({super.key});

  @override
  State<MaterialsScreen> createState() => _MaterialsScreenState();
}

class _MaterialsScreenState extends State<MaterialsScreen> {
  String _selectedType = 'All Equipment';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final repo = PioneerMockRepository.instance;
    final materialsLots = repo.getLots().where((l) => l.category == LotCategory.generalMaterials).toList();

    final filteredLots = materialsLots.where((lot) {
      if (_selectedType == 'Heavy Machinery' && !lot.title.toLowerCase().contains('excavator') && !lot.title.toLowerCase().contains('forklift')) return false;
      if (_selectedType == 'Generators' && !lot.title.toLowerCase().contains('generator')) return false;
      if (_selectedType == 'Raw Materials' && !lot.title.toLowerCase().contains('steel')) return false;
      if (_selectedType == 'Office & Storage' && !lot.title.toLowerCase().contains('office') && !lot.title.toLowerCase().contains('racking')) return false;
      if (_searchQuery.isNotEmpty && !lot.title.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: const PioneerAppHeader(
        isRoot: false,
        title: 'General Materials',
        subtitle: 'Construction Equipment, Industrial Assets & Surplus',
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
                    hintText: 'Search industrial assets, machinery, lots...',
                    onChanged: (val) => setState(() => _searchQuery = val),
                  ),
                  const SizedBox(height: 14),
                  // Asset Type Filter Pills
                  _buildTypeFilters(),
                  const SizedBox(height: 14),
                  // Industrial Promo Banner
                  _buildIndustrialBanner(),
                  const SizedBox(height: 14),
                  // Count & Sort Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${filteredLots.length} Industrial Lots Found',
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

  Widget _buildTypeFilters() {
    final types = ['All Equipment', 'Heavy Machinery', 'Generators', 'Raw Materials', 'Office & Storage'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: types.map((type) {
          final isSelected = _selectedType == type;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: GestureDetector(
              onTap: () => setState(() => _selectedType = type),
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
                  type,
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

  Widget _buildIndustrialBanner() {
    return Container(
      height: 110,
      decoration: BoxDecoration(
        borderRadius: PioneerSpacing.borderRadiusCard,
        boxShadow: PioneerSpacing.cardShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              AssetPaths.bannerIndustrial,
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Colors.black.withValues(alpha: 0.85),
                    Colors.black.withValues(alpha: 0.35),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Industrial Assets Build\nGreater Opportunities',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: PioneerColors.brandOrange,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Certified Inspections Guaranteed',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
