import 'package:intl/intl.dart';

abstract class PioneerFormatters {
  static final NumberFormat _currencyFormat = NumberFormat('#,###', 'en_US');

  /// Formats amount into standard Pioneer format: "AED 85,000"
  /// Includes LTR isolates (\u202A ... \u202C) for BiDi safety in Arabic RTL context.
  static String currency(num amount, {String symbol = 'AED', bool isolate = true}) {
    final str = '$symbol ${_currencyFormat.format(amount)}';
    return isolate ? '\u202A$str\u202C' : str;
  }

  /// Formats integer into comma separated: "1,248"
  static String number(num value, {bool isolate = false}) {
    final str = _currencyFormat.format(value);
    return isolate ? '\u202A$str\u202C' : str;
  }

  /// Formats duration into countdown: "2h 14m 32s" or "2h 14m"
  static String countdown(Duration duration, {bool includeSeconds = true, bool isolate = true}) {
    final int hours = duration.inHours;
    final int minutes = duration.inMinutes.remainder(60);
    final int seconds = duration.inSeconds.remainder(60);

    String str;
    if (hours > 24) {
      final int days = duration.inDays;
      final int remHours = hours.remainder(24);
      str = '${days}d ${remHours}h';
    } else if (includeSeconds) {
      str = '${hours}h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s';
    } else {
      str = '${hours}h ${minutes.toString().padLeft(2, '0')}m';
    }
    return isolate ? '\u202A$str\u202C' : str;
  }

  /// Wraps an identifier (VIN, Lot Number, Phone) in an LTR isolate for BiDi safety
  static String identifier(String id) {
    return '\u202A$id\u202C';
  }

  /// Formats date into "APR 26" or "APR 26, 2026"
  static String date(DateTime dateTime, {bool includeYear = true}) {
    final format = includeYear ? DateFormat('MMM dd, yyyy') : DateFormat('MMM dd');
    return format.format(dateTime).toUpperCase();
  }
}
