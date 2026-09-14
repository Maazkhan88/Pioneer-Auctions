import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app/router.dart';
import 'core/theme/pioneer_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Configure Android status bar styling (transparent bar with dark icons)
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const PioneerMobileApp());
}

class PioneerMobileApp extends StatelessWidget {
  const PioneerMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Pioneer Auctions',
      debugShowCheckedModeBanner: false,
      theme: PioneerTheme.lightTheme,
      routerConfig: PioneerRouter.router,
    );
  }
}
