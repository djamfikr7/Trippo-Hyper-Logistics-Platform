import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_core/shared_core.dart';
import 'src/features/auth/login_screen.dart';
import 'src/features/home/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: TrippoRiderApp()));
}

class TrippoRiderApp extends StatelessWidget {
  const TrippoRiderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trippo Rider',
      debugShowCheckedModeBanner: false,
      theme: TrippoTheme.lightTheme,
      darkTheme: TrippoTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const LoginScreen(), // Default to login
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
      },
    );
  }
}
