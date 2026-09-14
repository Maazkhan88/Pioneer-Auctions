import 'package:intl/intl.dart';

abstract class PioneerFormatters {
  static final NumberFormat _currencyFormat = NumberFormat('#,###', 'en_US');

  /// Formats amount into standard Pioneer format: "AED 85,000"
  static String currency(num amount, {String symbol = 'AED'}) {
    return '$symbol ${_currencyFormat.format(amount)}';
  }

  /// Formats integer into comma separated: "1,248"
  static String number(num value) {
    return _currencyFormat.format(value);
  }

  /// Formats duration into countdown: "2h 14m 32s" or "2h 14m"
  static String countdown(Duration duration, {bool includeSeconds = true}) {
    final int hours = duration.inHours;
    final int minutes = duration.inMinutes.remainder(60);
    final int seconds = duration.inSeconds.remainder(60);

    if (hours > 24) {
      final int days = duration.inDays;
      final int remHours = hours.remainder(24);
      return '${days}d ${remHours}h';
    }

    if (includeSeconds) {
      return '${hours}h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s';
    } else {
      return '${hours}h ${minutes.toString().padLeft(2, '0')}m';
    }
  }

  /// Formats date into "APR 26" or "APR 26, 2026"
  static String date(DateTime dateTime, {bool includeYear = true}) {
    final format = includeYear ? DateFormat('MMM dd, yyyy') : DateFormat('MMM dd');
    return format.format(dateTime).toUpperCase();
  }
}
