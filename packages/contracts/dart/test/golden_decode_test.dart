import 'dart:io';

import '../lib/pioneer_contracts.dart';

void main() {
  final fixture = File.fromUri(
    Platform.script.resolve('../../fixtures/v1/golden-fixtures.json'),
  ).readAsStringSync();
  final contracts = PioneerContracts.fromRawJson(fixture);

  expectEqual(contracts.money.currency, Currency.AED, 'Money.currency');
  expectEqual(contracts.money.amountFils, 5200000, 'Money.amountFils');
  expectEqual(contracts.lotSnapshot.sequence, 42, 'LotSnapshot.sequence');
  expectEqual(
    contracts.placeBidCommand.expectedSequence,
    41,
    'PlaceBidCommand.expectedSequence',
  );
  expectEqual(
    contracts.commandAck.status,
    CommandAckStatus.ACCEPTED,
    'CommandAck.status',
  );

  final roundTrip = PioneerContracts.fromRawJson(contracts.toRawJson());
  expectEqual(roundTrip.money.amountFils, 5200000, 'round-trip amountFils');
  stdout.writeln('Dart golden contract decode passed.');
}

void expectEqual(Object? actual, Object? expected, String field) {
  if (actual != expected) {
    throw StateError('$field: expected $expected, received $actual');
  }
}
