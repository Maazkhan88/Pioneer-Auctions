import 'dart:math';

/// Cryptographically secure RFC 4122 Version 4 UUID generator and validator.
abstract class UuidService {
  static final Random _secureRandom = Random.secure();
  static final RegExp _uuidRegex = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
  );

  /// Generates a valid RFC 4122 v4 UUID string.
  static String generate() {
    final values = List<int>.generate(16, (_) => _secureRandom.nextInt(256));

    // Set version bits to 0100 (4)
    values[6] = (values[6] & 0x0f) | 0x40;
    // Set variant bits to 10xx
    values[8] = (values[8] & 0x3f) | 0x80;

    final hex = values.map((b) => b.toRadixString(16).padLeft(2, '0')).toList();

    return '${hex[0]}${hex[1]}${hex[2]}${hex[3]}-'
        '${hex[4]}${hex[5]}-'
        '${hex[6]}${hex[7]}-'
        '${hex[8]}${hex[9]}-'
        '${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}';
  }

  /// Checks if [value] is a valid UUID string.
  static bool isValid(String? value) {
    if (value == null || value.length != 36) return false;
    return _uuidRegex.hasMatch(value);
  }
}
