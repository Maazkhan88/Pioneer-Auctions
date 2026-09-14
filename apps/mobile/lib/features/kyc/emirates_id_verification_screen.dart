import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/pioneer_spacing.dart';
import '../../core/localization/pioneer_localizations.dart';
import '../../core/session/session_service.dart';
import '../../core/theme/pioneer_colors.dart';
import '../../core/theme/pioneer_typography.dart';
import '../../design_system/components/pioneer_button.dart';

enum KycStep {
  front,
  back,
  liveness,
  review,
}

/// Guided multi-step Emirates ID document scanner & liveness verification screen.
class EmiratesIdVerificationScreen extends StatefulWidget {
  const EmiratesIdVerificationScreen({super.key});

  @override
  State<EmiratesIdVerificationScreen> createState() => _EmiratesIdVerificationScreenState();
}

class _EmiratesIdVerificationScreenState extends State<EmiratesIdVerificationScreen> {
  KycStep _currentStep = KycStep.front;

  // Extracted OCR fields
  final TextEditingController _nameEnController = TextEditingController(text: 'Ahmed Al Mansoori');
  final TextEditingController _nameArController = TextEditingController(text: 'أحمد المنصوري');
  final TextEditingController _idNumberController = TextEditingController(text: '784-1992-1234567-1');
  final TextEditingController _nationalityController = TextEditingController(text: 'United Arab Emirates');
  final TextEditingController _dobController = TextEditingController(text: '1992-05-15');
  final TextEditingController _expiryController = TextEditingController(text: '2028-05-14');

  bool _frontCaptured = false;
  bool _backCaptured = false;
  bool _livenessVerified = false;
  bool _declarationAccepted = true;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameEnController.dispose();
    _nameArController.dispose();
    _idNumberController.dispose();
    _nationalityController.dispose();
    _dobController.dispose();
    _expiryController.dispose();
    super.dispose();
  }

  void _onFrontCaptured() {
    HapticFeedback.mediumImpact();
    setState(() {
      _frontCaptured = true;
      _currentStep = KycStep.back;
    });
  }

  void _onBackCaptured() {
    HapticFeedback.mediumImpact();
    setState(() {
      _backCaptured = true;
      _currentStep = KycStep.liveness;
    });
  }

  void _onLivenessCompleted() {
    HapticFeedback.heavyImpact();
    setState(() {
      _livenessVerified = true;
      _currentStep = KycStep.review;
    });
  }

  Future<void> _submitVerification() async {
    if (!_declarationAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the declaration to proceed.'),
          backgroundColor: PioneerColors.statusExpiredText,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    await SessionService.instance.submitKycVerification(
      emiratesIdNumber: _idNumberController.text.trim(),
      fullNameEn: _nameEnController.text.trim(),
      fullNameAr: _nameArController.text.trim(),
      nationality: _nationalityController.text.trim(),
      dateOfBirth: _dobController.text.trim(),
      expiryDate: _expiryController.text.trim(),
    );

    HapticFeedback.heavyImpact();
    if (!mounted) return;

    setState(() => _isSubmitting = false);

    // Show celebratory verification modal
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: PioneerColors.winningBadgeBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.verified_user_rounded,
                size: 36,
                color: PioneerColors.winningBadgeText,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Identity Verified!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: PioneerColors.brandPurpleDeep,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your Emirates ID has been verified. You have been assigned ${SessionService.instance.verifiedIdentity?.bidderPaddleNumber ?? "Bidder #2456"}. You are now eligible to place bids in all live auctions.',
              style: PioneerTypography.metadata.copyWith(
                fontSize: 13,
                color: PioneerColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: PioneerButton(
                label: 'Start Bidding',
                onPressed: () {
                  Navigator.of(ctx).pop();
                  context.go('/browse');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: PioneerColors.background,
      appBar: AppBar(
        backgroundColor: PioneerColors.brandPurpleDeep,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Emirates ID Verification',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Step Progress Bar
          _buildStepProgressIndicator(),

          // Main Step Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: PioneerSpacing.pageMargin, vertical: 16),
              child: _buildCurrentStepContent(l10n),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepProgressIndicator() {
    final steps = [
      {'label': 'Front', 'step': KycStep.front},
      {'label': 'Back', 'step': KycStep.back},
      {'label': 'Selfie', 'step': KycStep.liveness},
      {'label': 'Review', 'step': KycStep.review},
    ];

    return Container(
      color: PioneerColors.surface,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: PioneerSpacing.pageMargin),
      child: Row(
        children: List.generate(steps.length, (index) {
          final s = steps[index];
          final stepEnum = s['step'] as KycStep;
          final isCompleted = _isStepCompleted(stepEnum);
          final isCurrent = _currentStep == stepEnum;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCompleted
                              ? PioneerColors.winningBadgeText
                              : isCurrent
                                  ? PioneerColors.brandPurple
                                  : PioneerColors.borderCard,
                        ),
                        child: Center(
                          child: isCompleted
                              ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                              : Text(
                                  '${index + 1}',
                                  style: TextStyle(
                                    color: isCurrent ? Colors.white : PioneerColors.textMuted,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        s['label'] as String,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                          color: isCurrent ? PioneerColors.brandPurple : PioneerColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                if (index < steps.length - 1)
                  Container(
                    width: 24,
                    height: 2,
                    color: isCompleted ? PioneerColors.winningBadgeText : PioneerColors.borderCard,
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  bool _isStepCompleted(KycStep step) {
    switch (step) {
      case KycStep.front:
        return _frontCaptured;
      case KycStep.back:
        return _backCaptured;
      case KycStep.liveness:
        return _livenessVerified;
      case KycStep.review:
        return false;
    }
  }

  Widget _buildCurrentStepContent(PioneerLocalizations l10n) {
    switch (_currentStep) {
      case KycStep.front:
        return _buildFrontStep();
      case KycStep.back:
        return _buildBackStep();
      case KycStep.liveness:
        return _buildLivenessStep();
      case KycStep.review:
        return _buildReviewStep();
    }
  }

  Widget _buildFrontStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Scan Emirates ID (Front)',
          style: PioneerTypography.sectionTitle,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          'Position the front of your Emirates ID card inside the frame until edges are highlighted.',
          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),

        // Simulated Card Viewfinder Overlay
        _buildCardViewfinder(
          isFront: true,
          title: 'UNITED ARAB EMIRATES',
          subtitle: 'FEDERAL AUTHORITY FOR IDENTITY, CITIZENSHIP & PORT SECURITY',
        ),
        const SizedBox(height: 24),

        // OCR Preview Fields
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: PioneerColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: PioneerColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.document_scanner_rounded, size: 16, color: PioneerColors.brandPurple),
                  SizedBox(width: 8),
                  Text(
                    'Instant OCR Extraction',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: PioneerColors.brandPurple),
                  ),
                ],
              ),
              const Divider(height: 16),
              _buildEditableField('Full Name (English)', _nameEnController),
              const SizedBox(height: 10),
              _buildEditableField('Emirates ID Number', _idNumberController),
              const SizedBox(height: 10),
              _buildEditableField('Nationality', _nationalityController),
            ],
          ),
        ),
        const SizedBox(height: 24),

        PioneerButton(
          label: 'Capture Front & Continue',
          leadingIcon: Icons.camera_alt_rounded,
          onPressed: _onFrontCaptured,
        ),
      ],
    );
  }

  Widget _buildBackStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Scan Emirates ID (Back)',
          style: PioneerTypography.sectionTitle,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          'Flip your card over and align the 3-line Machine Readable Zone (MRZ) strip at the bottom.',
          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),

        _buildCardViewfinder(
          isFront: false,
          title: 'MACHINE READABLE ZONE',
          subtitle: 'I<ARE784199212345671<<<<<<<<<<<<<<<\n9205150M2805142ARE<<<<<<<<<<<8\nAL<MANSOORI<<AHMED<<<<<<<<<<<<<<',
        ),
        const SizedBox(height: 24),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: PioneerColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: PioneerColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.qr_code_scanner_rounded, size: 16, color: PioneerColors.brandPurple),
                  SizedBox(width: 8),
                  Text(
                    'MRZ Validation & Validity',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: PioneerColors.brandPurple),
                  ),
                ],
              ),
              const Divider(height: 16),
              _buildEditableField('Date of Birth', _dobController),
              const SizedBox(height: 10),
              _buildEditableField('Card Expiry Date', _expiryController),
            ],
          ),
        ),
        const SizedBox(height: 24),

        PioneerButton(
          label: 'Capture Back & Continue',
          leadingIcon: Icons.camera_alt_rounded,
          onPressed: _onBackCaptured,
        ),
      ],
    );
  }

  Widget _buildLivenessStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Face Liveness Check',
          style: PioneerTypography.sectionTitle,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          'Look directly at the camera. Ensure you are in a well-lit area without sunglasses or hats.',
          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),

        // Oval Face Viewfinder
        Center(
          child: Container(
            width: 220,
            height: 280,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(120),
              border: Border.all(
                color: PioneerColors.brandPurple,
                width: 3,
              ),
              color: PioneerColors.brandPurpleLight.withValues(alpha: 0.3),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  Icons.face_retouching_natural_rounded,
                  size: 110,
                  color: PioneerColors.brandPurple.withValues(alpha: 0.6),
                ),
                Positioned(
                  bottom: 24,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.visibility_rounded, size: 14, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          'Blink Once',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 36),

        PioneerButton(
          label: 'Confirm Face Liveness',
          leadingIcon: Icons.check_circle_outline_rounded,
          onPressed: _onLivenessCompleted,
        ),
      ],
    );
  }

  Widget _buildReviewStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Review & Confirm Identity',
          style: PioneerTypography.sectionTitle,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          'Please verify your extracted information before final submission.',
          style: PioneerTypography.metadata.copyWith(color: PioneerColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),

        // Identity Card Preview
        Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [PioneerColors.brandPurpleDeep, PioneerColors.brandPurple],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: PioneerSpacing.cardShadow,
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'UNITED ARAB EMIRATES',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'RESIDENT IDENTITY',
                      style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                _nameEnController.text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                _nameArController.text,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ID NUMBER',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 9, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _idNumberController.text,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'EXPIRY DATE',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 9, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _expiryController.text,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Verification Checklist
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: PioneerColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: PioneerColors.border),
          ),
          child: const Column(
            children: [
              _ChecklistRow(icon: Icons.check_circle_rounded, text: 'Card Front & Security Hologram Verified'),
              SizedBox(height: 8),
              _ChecklistRow(icon: Icons.check_circle_rounded, text: 'Card Back & MRZ Checksum Validated'),
              SizedBox(height: 8),
              _ChecklistRow(icon: Icons.check_circle_rounded, text: 'Facial Biometric Match Confirmed (98.4%)'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Declaration
        CheckboxListTile(
          value: _declarationAccepted,
          onChanged: (val) => setState(() => _declarationAccepted = val ?? false),
          title: Text(
            'I certify that I am the authorized holder of this Emirates ID and all provided details are authentic.',
            style: PioneerTypography.metadata.copyWith(fontSize: 11.5),
          ),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          dense: true,
          activeColor: PioneerColors.brandPurple,
        ),
        const SizedBox(height: 20),

        PioneerButton(
          label: 'Submit & Get Bidder Paddle',
          isLoading: _isSubmitting,
          onPressed: _isSubmitting ? null : _submitVerification,
        ),
      ],
    );
  }

  Widget _buildCardViewfinder({
    required bool isFront,
    required String title,
    required String subtitle,
  }) {
    return AspectRatio(
      aspectRatio: 1.58, // Standard credit / ID card ratio
      child: Container(
        decoration: BoxDecoration(
          color: PioneerColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: PioneerColors.brandPurple, width: 2),
        ),
        child: Stack(
          children: [
            // Viewfinder Corner Highlights
            Positioned(top: 10, left: 10, child: _buildCornerBracket()),
            Positioned(top: 10, right: 10, child: Transform.rotate(angle: 1.5708, child: _buildCornerBracket())),
            Positioned(bottom: 10, left: 10, child: Transform.rotate(angle: -1.5708, child: _buildCornerBracket())),
            Positioned(bottom: 10, right: 10, child: Transform.rotate(angle: 3.14159, child: _buildCornerBracket())),

            // Inner graphic representation
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: isFront
                  ? Row(
                      children: [
                        Container(
                          width: 64,
                          height: 80,
                          decoration: BoxDecoration(
                            color: PioneerColors.brandPurpleLight,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: PioneerColors.brandPurple),
                          ),
                          child: const Icon(Icons.person_rounded, size: 40, color: PioneerColors.brandPurple),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: PioneerColors.brandPurple,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(height: 6, width: 120, color: PioneerColors.borderCard),
                              const SizedBox(height: 6),
                              Container(height: 6, width: 90, color: PioneerColors.borderCard),
                              const SizedBox(height: 6),
                              Container(height: 6, width: 140, color: PioneerColors.borderCard),
                            ],
                          ),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(height: 24, color: PioneerColors.borderCard),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                            color: PioneerColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCornerBracket() {
    return Container(
      width: 24,
      height: 24,
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: PioneerColors.brandPurple, width: 4),
          left: BorderSide(color: PioneerColors.brandPurple, width: 4),
        ),
      ),
    );
  }

  Widget _buildEditableField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: PioneerTypography.metadata.copyWith(fontSize: 10.5, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
      ],
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _ChecklistRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: PioneerColors.winningBadgeText),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: PioneerColors.textPrimary),
          ),
        ),
      ],
    );
  }
}
