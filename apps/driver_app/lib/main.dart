import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_core/shared_core.dart';
import 'src/features/auth/login_screen.dart';
import 'src/features/home/driver_home_screen.dart';

void main() {
  runApp(const ProviderScope(child: TrippoDriverApp()));
}

class TrippoDriverApp extends StatelessWidget {
  const TrippoDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trippo Driver',
      debugShowCheckedModeBanner: false,
      theme: TrippoTheme.lightTheme,
      darkTheme: TrippoTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const LoginScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const DriverHomeScreen(),
      },
    );
  }
}
