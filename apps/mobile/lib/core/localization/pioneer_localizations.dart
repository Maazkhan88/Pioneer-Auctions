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

  // Fee Breakdown & Gates
  String get tapToBid => isArabic ? 'اضغط لتقديم مزايدة' : 'Tap to place bid';
  String get slideRightToBid => isArabic ? 'مرر لتأكيد المزايدة لمنع المزايدة غير المقصودة.' : 'Slide to confirm bid. This helps prevent accidental bidding.';
  String get slideSubmitting => isArabic ? 'جاري إرسال المزايدة...' : 'Submitting bid...';
  String get termsRequiredTitle => isArabic ? 'الموافقة على الشروط والأحكام' : 'Terms & Conditions Required';
  String get termsRequiredMessage => isArabic ? 'يرجى مراجعة وقبول شروط المزاد للمتابعة.' : 'Please review and accept the auction terms and conditions.';
  String get acceptTerms => isArabic ? 'أوافق على شروط وأحكام بايونير للمزادات' : 'I accept the Pioneer Auctions Terms & Conditions';
  String get depositRequiredTitle => isArabic ? 'مطلوب إيداع تأمين' : 'Deposit Required';
  String get depositRequiredMessage => isArabic ? 'مطلوب إيداع تأمين بنكي للمزايدة على هذا اللوط.' : 'A security deposit is required to bid on this lot.';
  String get kycRequiredTitle => isArabic ? 'توثيق الحساب مطلوب' : 'Verification Required';
  String get kycRequiredMessage => isArabic ? 'يرجى مسح بطاقة الهوية الإماراتية لتوثيق حسابك.' : 'Please scan your Emirates ID to verify your account.';
  String get auctionClosedMessage => isArabic ? 'هذا المزاد مغلق حالياً.' : 'This auction is currently closed.';
  String get buyersPremium => isArabic ? 'رسوم المشتري (5٪)' : "Buyer's Premium (5%)";
  String get vat => isArabic ? 'ضريبة القيمة المضافة (5٪)' : 'VAT (5%)';
  String get totalAmount => isArabic ? 'إجمالي المبلغ المستحق' : 'Total Payable Amount';
  String get awaitingConfirmation => isArabic ? 'في انتظار تأكيد المزايدة...' : 'Awaiting confirmation...';
  String get retryBid => isArabic ? 'إعادة المحاولة' : 'Retry Bid';
  String get outbidMessage => isArabic ? 'تمت المزايدة عليك بسعر أعلى!' : 'You have been outbid!';
  String get bidAcceptedTitle => isArabic ? 'تم قبول المزايدة بنجاح!' : 'Bid Accepted!';
  String get bidRejectedTitle => isArabic ? 'لم يتم قبول المزايدة' : 'Bid Not Accepted';
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
