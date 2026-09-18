import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pioneer_contracts/pioneer_contracts.dart';
import 'package:pioneer_mobile/core/localization/pioneer_localizations.dart';
import 'package:pioneer_mobile/core/network/api_client.dart';
import 'package:pioneer_mobile/core/network/api_result.dart';
import 'package:pioneer_mobile/core/session/session_service.dart';
import 'package:pioneer_mobile/features/kyc/emirates_id_verification_screen.dart';

class FakeImagePicker extends Fake implements ImagePicker {
  int callIndex = 0;

  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async {
    callIndex++;
    if (preferredCameraDevice == CameraDevice.front) {
      return XFile('selfie.jpg', name: 'selfie.jpg');
    }
    if (callIndex == 1) {
      return XFile('front.jpg', name: 'front.jpg');
    }
    return XFile('back.jpg', name: 'back.jpg');
  }
}

void main() {
  group('Task 008 — Emirates ID KYC & Session State', () {
    late SessionService session;

    setUp(() {
      session = SessionService.instance;
      session.resetKycForTesting();
    });

    test('SessionService defaults to unverified and does not grant paddle without VERIFIED ack', () async {
      expect(session.isKycVerified, isFalse);
      expect(session.kycStatus, MobileKycStatus.unverified);
      expect(session.verifiedIdentity, isNull);

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/me/kyc/submit') {
          final payload = {
            'status': 'PENDING',
            'bidderNumber': null,
            'submittedAt': DateTime.now().toIso8601String(),
            'estimatedCompletion': '1 business day',
          };
          return http.Response(json.encode(payload), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      session.configureApiClient(apiClient);

      // Submit verification
      final result = await session.submitKycVerification(
        emiratesIdNumber: '784-1995-9876543-2',
        fullNameEn: 'Fatima Al Zaabi',
        fullNameAr: 'فاطمة الزعابي',
        nationality: 'United Arab Emirates',
        dateOfBirth: '1995-08-20',
        expiryDate: '2030-08-19',
        cardFrontRef: 'doc-front-123',
        cardBackRef: 'doc-back-123',
        selfieRef: 'doc-selfie-123',
      );

      expect(result, isA<ApiSuccess<SubmitKycResponse>>());
      // Crucial: Pending state upon submission, NOT verified!
      expect(session.isKycVerified, isFalse);
      expect(session.kycStatus, MobileKycStatus.pending);
      expect(session.verifiedIdentity, isNull);
    });

    test('SessionService grants paddle and verified identity only when server returns VERIFIED', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/me/kyc') {
          final payload = {
            'status': 'VERIFIED',
            'bidderNumber': 'Paddle #7712',
            'updatedAt': DateTime.now().toIso8601String(),
          };
          return http.Response(json.encode(payload), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, baseUrl: 'http://localhost:3000');
      session.configureApiClient(apiClient);

      final status = await session.loadKycStatus();
      expect(status, MobileKycStatus.verified);
      expect(session.isKycVerified, isTrue);
      expect(session.verifiedIdentity?.bidderPaddleNumber, 'Paddle #7712');
      expect(session.verifiedIdentity?.maskedId, '784-****-*******-1');
    });
  });

  group('Task 008 — EmiratesIdVerificationScreen Multi-Step Flow', () {
    late FakeImagePicker fakePicker;
    late ApiClient mockApiClient;

    setUp(() {
      SessionService.instance.resetKycForTesting();
      fakePicker = FakeImagePicker();

      final mockHttpClient = MockClient((request) async {
        if (request.url.path == '/api/v1/me/kyc/submit') {
          final payload = {
            'status': 'PENDING',
            'bidderNumber': null,
            'submittedAt': DateTime.now().toIso8601String(),
            'estimatedCompletion': '1 business day',
          };
          return http.Response(json.encode(payload), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      mockApiClient = ApiClient(httpClient: mockHttpClient, baseUrl: 'http://localhost:3000');
      SessionService.instance.configureApiClient(mockApiClient);
    });

    Widget createTestWidget() {
      return MaterialApp(
        localizationsDelegates: const [
          PioneerLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en'), Locale('ar')],
        home: EmiratesIdVerificationScreen(
          imagePicker: fakePicker,
          apiClient: mockApiClient,
        ),
      );
    }

    testWidgets('advances through camera steps, camera-only selfie, and submits to PENDING', (tester) async {
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
      expect(find.text('Open Camera & Take Photo'), findsOneWidget);
      expect(find.text('Upload Front from Photos'), findsOneWidget);
      // Verify bypass button and mock identity are removed
      expect(find.text('Capture Front & Continue'), findsNothing);
      expect(find.text('Ahmed Al Mansoori'), findsNothing);

      // Enter Step 1 fields
      final step1Fields = find.byType(TextField);
      expect(step1Fields, findsNWidgets(3));
      await tester.enterText(step1Fields.at(0), 'Sara Al Nuaimi');
      await tester.enterText(step1Fields.at(1), '784-1990-1234567-1');
      await tester.enterText(step1Fields.at(2), 'United Arab Emirates');

      // Tap Open Camera & Take Photo
      await tester.tap(find.text('Open Camera & Take Photo'));
      await tester.pumpAndSettle();

      // Step 2: Back
      expect(find.text('Scan Emirates ID (Back)'), findsOneWidget);
      expect(find.text('Open Camera & Scan Back'), findsOneWidget);
      expect(find.text('Upload Back from Photos'), findsOneWidget);
      expect(find.text('Capture Back & Continue'), findsNothing);

      // Enter Step 2 fields
      final step2Fields = find.byType(TextField);
      expect(step2Fields, findsNWidgets(2));
      await tester.enterText(step2Fields.at(0), '1990-01-01');
      await tester.enterText(step2Fields.at(1), '2028-01-01');

      // Tap Open Camera & Scan Back
      await tester.tap(find.text('Open Camera & Scan Back'));
      await tester.pumpAndSettle();

      // Step 3: Selfie / Truthful wording
      expect(find.text('Take a Selfie for Verification'), findsOneWidget);
      expect(find.text('Face Liveness Check'), findsNothing);
      expect(find.text('Take Selfie with Front Camera'), findsOneWidget);
      // Verify gallery upload is forbidden for selfie (camera-only requirement)
      expect(find.text('Upload Selfie from Photos'), findsNothing);
      expect(find.text('Confirm Face Liveness'), findsNothing);

      // Tap Take Selfie with Front Camera
      await tester.tap(find.text('Take Selfie with Front Camera'));
      await tester.pumpAndSettle();

      // Step 4: Review & Confirm
      expect(find.text('Review & Confirm Identity'), findsOneWidget);
      expect(find.text('Submit Verification'), findsOneWidget);
      expect(find.text('Submit & Get Bidder Paddle'), findsNothing);

      // Verify truthful checklist entries
      expect(find.text('Card Front Photo Captured (front.jpg)'), findsOneWidget);
      expect(find.text('Card Back Photo Captured (back.jpg)'), findsOneWidget);
      expect(find.text('Verification Selfie Captured (selfie.jpg)'), findsOneWidget);

      // Verify fake biometric and security checks are removed
      expect(find.text('Facial Biometric Match Confirmed (98.4%)'), findsNothing);
      expect(find.text('Card Front & Security Hologram Verified'), findsNothing);
      expect(find.text('Card Back & MRZ Checksum Validated'), findsNothing);

      // Check declaration checkbox
      final checkbox = find.byType(Checkbox);
      expect(checkbox, findsOneWidget);
      await tester.tap(checkbox);
      await tester.pumpAndSettle();

      // Tap Submit Verification
      await tester.tap(find.text('Submit Verification'));
      await tester.pumpAndSettle();

      // Authoritative Verification Pending Dialog appears (NOT instant verification!)
      expect(find.text('Verification Pending'), findsOneWidget);
      expect(find.text('Return to Account'), findsOneWidget);
      expect(find.text('Identity Verified!'), findsNothing);
      expect(find.text('Start Bidding'), findsNothing);

      // Session must remain pending and NOT verified
      expect(SessionService.instance.isKycVerified, isFalse);
      expect(SessionService.instance.kycStatus, MobileKycStatus.pending);
      expect(SessionService.instance.verifiedIdentity, isNull);
    });
  });
}
