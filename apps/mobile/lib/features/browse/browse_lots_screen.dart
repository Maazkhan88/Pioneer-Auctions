import 'dart:async';
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
  String _selectedStatus = 'All';
  String _searchQuery = '';
  String _sortBy = 'Ending Soon';
  double? _minPrice;
  double? _maxPrice;
  String? _selectedPricePreset;

  Timer? _debounceTimer;
  final TextEditingController _searchController = TextEditingController();

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

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String val) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() => _searchQuery = val);
      }
    });
  }

  int get _activeFilterCount {
    int count = 0;
    if (_selectedCategory != 'All') count++;
    if (_selectedStatus != 'All') count++;
    if (_minPrice != null || _maxPrice != null || _selectedPricePreset != null) count++;
    return count;
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

  void _showFacetFilterSheet() {
    String tempCategory = _selectedCategory;
    String tempStatus = _selectedStatus;
    String? tempPreset = _selectedPricePreset;
    final minPriceController = TextEditingController(
      text: _minPrice != null ? _minPrice!.round().toString() : '',
    );
    final maxPriceController = TextEditingController(
      text: _maxPrice != null ? _maxPrice!.round().toString() : '',
    );

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                top: 20,
                left: PioneerSpacing.pageMargin,
                right: PioneerSpacing.pageMargin,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: PioneerColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle bar
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: PioneerColors.border,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Text('Filter Lots', style: PioneerTypography.sectionTitle),
                            if (_activeFilterCount > 0) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: PioneerColors.brandPurple,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '$_activeFilterCount',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            setSheetState(() {
                              tempCategory = 'All';
                              tempStatus = 'All';
                              tempPreset = null;
                              minPriceController.clear();
                              maxPriceController.clear();
                            });
                          },
                          child: const Text(
                            'Reset All',
                            style: TextStyle(
                              color: PioneerColors.brandPurple,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: PioneerColors.border),
                    const SizedBox(height: 12),

                    // Status Section
                    const Text('Auction Status', style: PioneerTypography.cardTitle),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ['All', 'Live Now', 'Upcoming', 'Ending Soon'].map((status) {
                        final isSelected = tempStatus == status;
                        return ChoiceChip(
                          label: Text(status),
                          selected: isSelected,
                          selectedColor: PioneerColors.brandPurple,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : PioneerColors.textSecondary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 12,
                          ),
                          backgroundColor: PioneerColors.surfaceSubtle,
                          onSelected: (selected) {
                            if (selected) setSheetState(() => tempStatus = status);
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // Category Section
                    const Text('Category', style: PioneerTypography.cardTitle),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ['All', 'Vehicles', 'Real Estate', 'General Materials'].map((cat) {
                        final isSelected = tempCategory == cat;
                        return ChoiceChip(
                          label: Text(cat),
                          selected: isSelected,
                          selectedColor: PioneerColors.brandPurple,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : PioneerColors.textSecondary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 12,
                          ),
                          backgroundColor: PioneerColors.surfaceSubtle,
                          onSelected: (selected) {
                            if (selected) setSheetState(() => tempCategory = cat);
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // Price Range Presets
                    const Text('Price Range (AED)', style: PioneerTypography.cardTitle),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        {'id': 'under50k', 'label': '< 50,000'},
                        {'id': '50k_100k', 'label': '50k - 100k'},
                        {'id': '100k_250k', 'label': '100k - 250k'},
                        {'id': '250k_plus', 'label': '250,000+'},
                      ].map((preset) {
                        final isSelected = tempPreset == preset['id'];
                        return ChoiceChip(
                          label: Text(preset['label']!),
                          selected: isSelected,
                          selectedColor: PioneerColors.brandPurple,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : PioneerColors.textSecondary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 12,
                          ),
                          backgroundColor: PioneerColors.surfaceSubtle,
                          onSelected: (selected) {
                            setSheetState(() {
                              if (selected) {
                                tempPreset = preset['id'];
                                if (preset['id'] == 'under50k') {
                                  minPriceController.text = '0';
                                  maxPriceController.text = '50000';
                                } else if (preset['id'] == '50k_100k') {
                                  minPriceController.text = '50000';
                                  maxPriceController.text = '100000';
                                } else if (preset['id'] == '100k_250k') {
                                  minPriceController.text = '100000';
                                  maxPriceController.text = '250000';
                                } else if (preset['id'] == '250k_plus') {
                                  minPriceController.text = '250000';
                                  maxPriceController.clear();
                                }
                              } else {
                                tempPreset = null;
                                minPriceController.clear();
                                maxPriceController.clear();
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),

                    // Custom Min/Max Inputs
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: minPriceController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'Min Price (AED)',
                              hintText: '0',
                              isDense: true,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onChanged: (_) => setSheetState(() => tempPreset = null),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: maxPriceController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'Max Price (AED)',
                              hintText: 'No max',
                              isDense: true,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onChanged: (_) => setSheetState(() => tempPreset = null),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Apply Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: PioneerColors.brandPurple,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: () {
                          final parsedMin = double.tryParse(minPriceController.text.trim());
                          final parsedMax = double.tryParse(maxPriceController.text.trim());
                          setState(() {
                            _selectedCategory = tempCategory;
                            _selectedStatus = tempStatus;
                            _selectedPricePreset = tempPreset;
                            _minPrice = parsedMin;
                            _maxPrice = parsedMax;
                          });
                          Navigator.pop(bottomSheetContext);
                        },
                        child: const Text(
                          'Apply Filters',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredLots = _allLots.where((lot) {
      if (_selectedCategory == 'Vehicles' && lot.category != LotCategory.vehicles) return false;
      if (_selectedCategory == 'Real Estate' && lot.category != LotCategory.realEstate) return false;
      if (_selectedCategory == 'General Materials' && lot.category != LotCategory.generalMaterials) return false;

      if (_selectedStatus == 'Live Now' && lot.status != LotStatus.live) return false;
      if (_selectedStatus == 'Upcoming' && lot.status != LotStatus.upcoming) return false;
      if (_selectedStatus == 'Ending Soon' && lot.timeRemaining.inHours > 2) return false;

      if (_minPrice != null && lot.currentBid < _minPrice!) return false;
      if (_maxPrice != null && lot.currentBid > _maxPrice!) return false;

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchesTitle = lot.title.toLowerCase().contains(q);
        final matchesLotNumber = lot.lotNumber.toLowerCase().contains(q);
        if (!matchesTitle && !matchesLotNumber) return false;
      }
      return true;
    }).toList();

    // Active Sorting
    filteredLots.sort((a, b) {
      switch (_sortBy) {
        case 'Price: Low to High':
          return a.currentBid.compareTo(b.currentBid);
        case 'Price: High to Low':
          return b.currentBid.compareTo(a.currentBid);
        case 'Newest Listed':
          return b.id.compareTo(a.id);
        case 'Ending Soon':
        default:
          return a.timeRemaining.compareTo(b.timeRemaining);
      }
    });

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
                      controller: _searchController,
                      hintText: 'Search lots...',
                      onChanged: _onSearchChanged,
                      onFilterTap: _showFacetFilterSheet,
                      showFilterButton: true,
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
                        const Text('No Lots Found', style: PioneerTypography.sectionTitle),
                        const SizedBox(height: 6),
                        Text(
                          'No lots match your current search or category filter.',
                          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _selectedCategory = 'All';
                              _selectedStatus = 'All';
                              _selectedPricePreset = null;
                              _minPrice = null;
                              _maxPrice = null;
                              _searchQuery = '';
                              _searchController.clear();
                            });
                          },
                          child: const Text('Clear All Filters'),
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
