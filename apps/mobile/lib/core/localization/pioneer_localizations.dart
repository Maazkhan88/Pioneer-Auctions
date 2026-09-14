import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Global controller to switch application locale between English and Arabic.
class PioneerLocaleController extends ChangeNotifier {
  static final PioneerLocaleController instance = PioneerLocaleController._internal();
  factory PioneerLocaleController() => instance;
  PioneerLocaleController._internal();

  Locale _locale = const Locale('en');
  Locale get locale => _locale;

  bool get isArabic => _locale.languageCode == 'ar';

  void setLocale(Locale newLocale) {
    if (_locale != newLocale) {
      _locale = newLocale;
      notifyListeners();
    }
  }

  void toggleLocale() {
    if (isArabic) {
      setLocale(const Locale('en'));
    } else {
      setLocale(const Locale('ar'));
    }
  }
}

/// App-wide localized string translations for English and Arabic.
class PioneerLocalizations {
  final Locale locale;

  PioneerLocalizations(this.locale);

  static PioneerLocalizations of(BuildContext context) {
    return Localizations.of<PioneerLocalizations>(context, PioneerLocalizations) ??
        PioneerLocalizations(const Locale('en'));
  }

  static const LocalizationsDelegate<PioneerLocalizations> delegate = _PioneerLocalizationsDelegate();

  bool get isArabic => locale.languageCode == 'ar';

  // Navigation Tabs
  String get navHome => isArabic ? 'الرئيسية' : 'Home';
  String get navAuctions => isArabic ? 'المزادات' : 'Auctions';
  String get navBrowse => isArabic ? 'تصفح' : 'Browse';
  String get navMyBids => isArabic ? 'مزايداتي' : 'My Bids';
  String get navAccount => isArabic ? 'حسابي' : 'Account';

  // General & Brand
  String get appTitle => isArabic ? 'بايونير للمزادات' : 'Pioneer Auctions';
  String get searchPlaceholder => isArabic ? 'ابحث عن سيارات، عقارات، معدات...' : 'Search cars, real estate, machinery...';
  String get verifiedAccount => isArabic ? 'حساب موثق' : 'Verified Account';
  String get memberSince => isArabic ? 'عضو منذ' : 'Member since';
  String get language => isArabic ? 'اللغة' : 'Language';
  String get english => 'English';
  String get arabic => 'العربية';
  String get changeLanguage => isArabic ? 'تغيير اللغة' : 'Change Language';

  // Bidding & Live Room
  String get liveAuction => isArabic ? 'مزاد مباشر' : 'LIVE AUCTION';
  String get currentBid => isArabic ? 'المزايدة الحالية' : 'Current Bid';
  String get nextBid => isArabic ? 'المزايدة التالية' : 'Next Bid';
  String get nextMinimumBid => isArabic ? 'المزايدة التالية' : 'Next Minimum Bid';
  String get startingBid => isArabic ? 'سعر البداية' : 'Starting Bid';
  String get bidNow => isArabic ? 'زايد الآن' : 'Bid Now';
  String get placeBid => isArabic ? 'تأكيد المزايدة' : 'Place Bid';
  String get quickBid => isArabic ? 'مزايدة سريعة' : 'Quick Bid';
  String get customBid => isArabic ? 'مزايدة مخصصة' : 'Custom Bid';
  String get slideToBid => isArabic ? 'مرر لتأكيد مزايدة بقيمة' : 'Slide to place bid of';
  String get bidConfirmed => isArabic ? 'تم تأكيد المزايدة!' : 'BID CONFIRMED!';
  String get reserveMet => isArabic ? 'تم استيفاء السعر الأدنى' : 'Reserve Met';
  String get reserveNotMet => isArabic ? 'لم يتم استيفاء السعر الأدنى' : 'Reserve Not Met';
  String get endsIn => isArabic ? 'ينتهي خلال' : 'Ends in';
  String get currencySymbol => isArabic ? 'د.إ' : 'AED';

  // Metrics & Stats
  String get activeBids => isArabic ? 'مزايدات نشطة' : 'Active Bids';
  String get registered => isArabic ? 'مسجل' : 'Registered';
  String get watchlist => isArabic ? 'قائمة المراقبة' : 'Watchlist';
  String get wonLots => isArabic ? 'اللوطات الفائزة' : 'Won Lots';
  String get paymentsDue => isArabic ? 'المستحقات' : 'Payments Due';

  // Account Menu Items
  String get myRegisteredAuctions => isArabic ? 'مزاداتي المسجلة' : 'My Registered Auctions';
  String get myBidsAndOrders => isArabic ? 'مزايداتي وطلباتي' : 'My Bids & Orders';
  String get wonAssets => isArabic ? 'الأصول الفائزة' : 'Won Assets';
  String get paymentsAndInvoices => isArabic ? 'المدفوعات والفواتير' : 'Payments & Invoices';
  String get securityDeposits => isArabic ? 'مبالغ التأمين' : 'Security Deposits';
  String get documentsEmiratesId => isArabic ? 'المستندات والهوية الإماراتية' : 'Documents & Emirates ID';
  String get notificationCenter => isArabic ? 'مركز الإشعارات' : 'Notification Center';
  String get securityPrivacy => isArabic ? 'الأمان والخصوصية' : 'Security & Privacy';
  String get customerSupport => isArabic ? 'خدمة العملاء' : 'Customer Support';
  String get recentActivity => isArabic ? 'النشاط الأخير' : 'Recent Activity';

  // Categories
  String get vehicles => isArabic ? 'المركبات' : 'Vehicles';
  String get realEstate => isArabic ? 'العقارات' : 'Real Estate';
  String get machinery => isArabic ? 'المعدات الثقيلة' : 'Machinery';
  String get numberPlates => isArabic ? 'لوحات الأرقام' : 'Number Plates';
  String get jewelry => isArabic ? 'المجوهرات والساعات' : 'Jewelry & Watches';
}

class _PioneerLocalizationsDelegate extends LocalizationsDelegate<PioneerLocalizations> {
  const _PioneerLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ar'].contains(locale.languageCode);

  @override
  Future<PioneerLocalizations> load(Locale locale) {
    return SynchronousFuture<PioneerLocalizations>(PioneerLocalizations(locale));
  }

  @override
  bool shouldReload(_PioneerLocalizationsDelegate old) => false;
}

extension PioneerLocalizationsExtension on BuildContext {
  PioneerLocalizations get l10n => PioneerLocalizations.of(this);
}
