import 'package:flutter/material.dart';
import '../theme/trippo_theme.dart';

class NeumorphicTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String hintText;
  final IconData? prefixIcon;
  final bool obscureText;
  final TextInputType keyboardType;
  final Function(String)? onChanged;

  const NeumorphicTextField({
    super.key,
    this.controller,
    required this.hintText,
    this.prefixIcon,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: TrippoTheme.backgroundColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: TrippoTheme.lightShadowColor,
            offset: const Offset(3, 3),
            blurRadius: 3,
            spreadRadius: -3,
          ),
          BoxShadow(
            color: TrippoTheme.shadowColor,
            offset: const Offset(-3, -3),
            blurRadius: 3,
            spreadRadius: -3,
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: prefixIcon != null
              ? Icon(prefixIcon, color: Colors.grey)
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.transparent,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 16,
          ),
        ),
      ),
    );
  }
}
