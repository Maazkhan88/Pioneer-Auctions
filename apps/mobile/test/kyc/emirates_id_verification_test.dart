import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pioneer_mobile/core/session/session_service.dart';
import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';
import 'package:pioneer_mobile/features/kyc/emirates_id_verification_screen.dart';

void main() {
  group('Task 008 — Emirates ID KYC & Session State', () {
    late SessionService session;

    setUp(() {
      session = SessionService.instance;
      session.setKycStatus(MobileKycStatus.verified);
    });

    test('SessionService manages KYC verification lifecycle', () async {
      expect(session.isKycVerified, isTrue);
      expect(session.kycStatus, MobileKycStatus.verified);
      expect(session.verifiedIdentity?.fullNameEn, 'Ahmed Al Mansoori');

      // Reset for testing unverified state
      session.resetKycForTesting();
      expect(session.isKycVerified, isFalse);
      expect(session.kycStatus, MobileKycStatus.unverified);
      expect(session.verifiedIdentity, isNull);

      // Submit verification
      final future = session.submitKycVerification(
        emiratesIdNumber: '784-1995-9876543-2',
        fullNameEn: 'Fatima Al Zaabi',
        fullNameAr: 'فاطمة الزعابي',
        nationality: 'United Arab Emirates',
        dateOfBirth: '1995-08-20',
        expiryDate: '2030-08-19',
      );

      // Pending state during submission
      expect(session.kycStatus, MobileKycStatus.pending);

      await future;

      // Verified state upon completion
      expect(session.isKycVerified, isTrue);
      expect(session.kycStatus, MobileKycStatus.verified);
      expect(session.verifiedIdentity?.fullNameEn, 'Fatima Al Zaabi');
      expect(session.verifiedIdentity?.emiratesIdNumber, '784-1995-9876543-2');
      expect(session.verifiedIdentity?.bidderPaddleNumber, startsWith('Paddle #'));
    });
  });

  group('Task 008 — EmiratesIdVerificationScreen Multi-Step Flow', () {
    setUp(() {
      SessionService.instance.resetKycForTesting();
    });

    Widget createTestWidget() {
      return const MaterialApp(
        localizationsDelegates: [
          PioneerLocalizations.delegate,
        ],
        supportedLocales: [Locale('en'), Locale('ar')],
        home: EmiratesIdVerificationScreen(),
      );
    }

    testWidgets('advances through Front -> Back -> Selfie -> Review steps', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Step 1: Front
      expect(find.text('Scan Emirates ID (Front)'), findsOneWidget);
      expect(find.text('Capture Front & Continue'), findsOneWidget);
      expect(find.text('Ahmed Al Mansoori'), findsOneWidget);
      expect(find.text('784-1992-1234567-1'), findsOneWidget);

      // Tap Capture Front
      await tester.tap(find.text('Capture Front & Continue'));
      await tester.pumpAndSettle();

      // Step 2: Back
      expect(find.text('Scan Emirates ID (Back)'), findsOneWidget);
      expect(find.text('Capture Back & Continue'), findsOneWidget);
      expect(find.text('1992-05-15'), findsOneWidget);
      expect(find.text('2028-05-14'), findsOneWidget);

      // Tap Capture Back
      await tester.tap(find.text('Capture Back & Continue'));
      await tester.pumpAndSettle();

      // Step 3: Selfie / Liveness
      expect(find.text('Face Liveness Check'), findsOneWidget);
      expect(find.text('Confirm Face Liveness'), findsOneWidget);

      // Tap Confirm Face Liveness
      await tester.tap(find.text('Confirm Face Liveness'));
      await tester.pumpAndSettle();

      // Step 4: Review & Confirm
      expect(find.text('Review & Confirm Identity'), findsOneWidget);
      expect(find.text('Submit & Get Bidder Paddle'), findsOneWidget);
      expect(find.text('Card Front & Security Hologram Verified'), findsOneWidget);
      expect(find.text('Card Back & MRZ Checksum Validated'), findsOneWidget);
      expect(find.text('Facial Biometric Match Confirmed (98.4%)'), findsOneWidget);

      // Tap Submit
      await tester.tap(find.text('Submit & Get Bidder Paddle'));
      // Pump past simulation delay
      await tester.pump(const Duration(milliseconds: 1500));
      await tester.pumpAndSettle();

      // Verification Success Dialog appears
      expect(find.text('Identity Verified!'), findsOneWidget);
      expect(find.text('Start Bidding'), findsOneWidget);
      expect(SessionService.instance.isKycVerified, isTrue);
    });
  });
}
