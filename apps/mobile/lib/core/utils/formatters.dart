import 'package:intl/intl.dart';

abstract class PioneerFormatters {
  static final NumberFormat _currencyFormat = NumberFormat('#,##0', 'en_US');

  /// Formats amount into standard Pioneer format: "AED 85,000"
  /// Includes LTR isolates (\u2066 ... \u2069) for BiDi safety in Arabic RTL context.
  static String currency(num amount, {String symbol = 'AED', bool isolate = true}) {
    final str = '$symbol ${_currencyFormat.format(amount)}';
    return isolate ? '\u2066$str\u2069' : str;
  }

  /// Formats amount in integer fils (100 fils = 1 AED).
  /// If [amountFils] has no fractional AED (amountFils % 100 == 0), renders without decimals: "AED 85,000".
  /// If [amountFils] has non-zero fils (amountFils % 100 != 0), renders with 2 decimal places: "AED 89,462.50".
  /// Uses pure integer arithmetic to prevent floating-point inaccuracies.
  /// Includes LTR isolates (\u2066 ... \u2069) for BiDi safety in Arabic RTL context.
  static String formatFils(int amountFils, {String symbol = 'AED', bool isolate = true}) {
    final isNegative = amountFils < 0;
    final absFils = amountFils.abs();
    final wholePart = absFils ~/ 100;
    final fractionPart = absFils % 100;

    final wholeStr = _currencyFormat.format(wholePart);
    final String numStr;
    if (fractionPart == 0) {
      numStr = wholeStr;
    } else {
      numStr = '$wholeStr.${fractionPart.toString().padLeft(2, '0')}';
    }

    final sign = isNegative ? '-' : '';
    final str = '$sign$symbol $numStr';
    return isolate ? '\u2066$str\u2069' : str;
  }

  /// Formats integer into comma separated: "1,248"
  static String number(num value, {bool isolate = false}) {
    final str = _currencyFormat.format(value);
    return isolate ? '\u2066$str\u2069' : str;
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
    return isolate ? '\u2066$str\u2069' : str;
  }

  /// Wraps an identifier (VIN, Lot Number, Phone) in an LTR isolate for BiDi safety
  static String identifier(String id) {
    return '\u2066$id\u2069';
  }

  /// Formats date into "APR 26" or "APR 26, 2026"
  static String date(DateTime dateTime, {bool includeYear = true}) {
    final format = includeYear ? DateFormat('MMM dd, yyyy') : DateFormat('MMM dd');
    return format.format(dateTime).toUpperCase();
  }
}
