import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TrippoTheme {
  static const Color primaryColor = Color(0xFF6C63FF);
  static const Color backgroundColor = Color(0xFFE0E5EC);
  static const Color shadowColor = Color(0xFFA3B1C6);
  static const Color lightShadowColor = Color(0xFFFFFFFF);
  
  static const Color darkBackgroundColor = Color(0xFF2D3436);
  static const Color darkShadowColor = Color(0xFF212526);
  static const Color darkLightShadowColor = Color(0xFF394244);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryColor,
    scaffoldBackgroundColor: backgroundColor,
    textTheme: GoogleFonts.outfitTextTheme(),
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      background: backgroundColor,
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: primaryColor,
    scaffoldBackgroundColor: darkBackgroundColor,
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
      background: darkBackgroundColor,
    ),
  );
}

class NeumorphicDecoration {
  static BoxDecoration container({
    double borderRadius = 12,
    Color color = TrippoTheme.backgroundColor,
  }) =>
      BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: const [
          BoxShadow(
            color: TrippoTheme.shadowColor,
            offset: Offset(4, 4),
            blurRadius: 15,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: TrippoTheme.lightShadowColor,
            offset: Offset(-4, -4),
            blurRadius: 15,
            spreadRadius: 1,
          ),
        ],
      );

  static BoxDecoration inner({
    double borderRadius = 12,
    Color color = TrippoTheme.backgroundColor,
  }) =>
      BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(borderRadius),
      );
}
