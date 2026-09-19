import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

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

  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = [
    PioneerLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];

  static const List<Locale> supportedLocales = [
    Locale('en'),
    Locale('ar'),
  ];

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

  // Security Deposit Dashboard
  String get availableDeposit => isArabic ? 'الرصيد المتاح' : 'Available Balance';
  String get totalDeposited => isArabic ? 'إجمالي الودائع' : 'Total Deposited';
  String get heldDeposit => isArabic ? 'المبالغ المحجوزة' : 'Locked Holds';
  String get addDeposit => isArabic ? 'إيداع تأمين جديد' : 'Add Security Deposit';
  String get requestRefund => isArabic ? 'طلب استرداد التأمين' : 'Request Refund';
  String get refundNotice => isArabic ? 'يتم استرداد التأمين إلى وسيلة الدفع الأصلية خلال ٣-٥ أيام عمل.' : 'Refunds are processed back to your original payment method within 3–5 business days.';
  String get depositHistory => isArabic ? 'سجل عمليات التأمين' : 'Deposit History';
  String get enterCustomAmount => isArabic ? 'أدخل مبلغاً مخصصاً' : 'Enter custom amount';
  String get depositNow => isArabic ? 'إيداع الآن' : 'Deposit Now';
  String get proceedToPayment => isArabic ? 'المتابعة إلى بوابة الدفع' : 'Proceed to Payment';
  String get depositSuccessful => isArabic ? 'تم تأكيد إيداع التأمين بنجاح' : 'Deposit successfully cleared';

  // Notifications & Preferences (Task 010)
  String get notificationPreferences => isArabic ? 'تفضيلات الإشعارات' : 'Notification Preferences';
  String get markAllAsRead => isArabic ? 'تحديد الكل كمقروء' : 'Mark all as read';
  String get allNotifications => isArabic ? 'الكل' : 'All';
  String get bidsFilter => isArabic ? 'المزايدات' : 'Bids';
  String get depositsFilter => isArabic ? 'التأمين' : 'Deposits';
  String get remindersFilter => isArabic ? 'التنبيهات' : 'Reminders';
  String get today => isArabic ? 'اليوم' : 'Today';
  String get yesterday => isArabic ? 'أمس' : 'Yesterday';
  String get earlier => isArabic ? 'سابقاً' : 'Earlier';
  String get noNotifications => isArabic ? 'لا توجد إشعارات بعد' : 'No notifications yet';
  String get noNotificationsSubtitle => isArabic
      ? 'سنخبرك عند وجود تحديثات على مزايداتك وتأمينك.'
      : "We'll notify you when there are updates to your bids and deposits.";
  String get deliveryChannels => isArabic ? 'قنوات الإرسال' : 'Delivery Channels';
  String get pushNotifications => isArabic ? 'إشعارات الهاتف' : 'Push Notifications';
  String get emailNotifications => isArabic ? 'البريد الإلكتروني' : 'Email Notifications';
  String get smsNotifications => isArabic ? 'الرسائل النصية' : 'SMS Notifications';
  String get alertCategories => isArabic ? 'أنواع التنبيهات' : 'Alert Categories';
  String get notifyOutbidTitle => isArabic ? 'تنبيه تجاوز المزايدة' : 'Outbid Alerts';
  String get notifyOutbidSubtitle => isArabic ? 'تنبيه فوري عندما يتجاوز أحدهم مزايدتك' : 'Immediate alert when someone outbids you';
  String get notifyEndingSoonTitle => isArabic ? 'تنبيهات قرب انتهاء المزاد' : 'Ending Soon Milestones';
  String get notifyEndingSoonSubtitle => isArabic ? 'تنبيهات عند 24 ساعة، 1 ساعة، 30 دقيقة و 5 دقائق' : 'Reminders at 24h, 1h, 30m, and 5m';
  String get notifyDepositsTitle => isArabic ? 'عمليات التأمين والاسترداد' : 'Deposits & Refunds';
  String get notifyDepositsSubtitle => isArabic ? 'تأكيدات إيداع مبالغ التأمين واستردادها' : 'Confirmations for deposit credits and refunds';
  String get notifyMarketingTitle => isArabic ? 'العروض والإعلانات' : 'Marketing & Announcements';
  String get notifyMarketingSubtitle => isArabic ? 'أخبار المزادات القادمة والفرص الحصرية' : 'Upcoming auctions and exclusive catalogs';
  String get quietHours => isArabic ? 'ساعات الهدوء' : 'Quiet Hours';
  String get quietHoursSubtitle => isArabic ? 'كتم الإشعارات غير العاجلة أثناء الليل' : 'Mute non-critical alerts during the night';
  String get quietHoursStart => isArabic ? 'وقت البدء' : 'Start Time';
  String get quietHoursEnd => isArabic ? 'وقت الانتهاء' : 'End Time';
  String get quietHoursBypassNotice => isArabic
      ? 'تنبيه: التنبيهات الحساسة للوقت (مثل تجاوز المزايدة وتمديد المزاد) ستصلك فوراً حتى خلال ساعات الهدوء.'
      : 'Note: Time-critical bidding alerts (such as outbid and auction extensions) will always bypass quiet hours.';
  String get preferencesSaved => isArabic ? 'تم حفظ التفضيلات بنجاح' : 'Preferences saved successfully';
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
