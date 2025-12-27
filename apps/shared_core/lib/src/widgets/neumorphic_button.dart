import 'package:flutter/material.dart';
import '../theme/trippo_theme.dart';

class NeumorphicButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final double borderRadius;
  final EdgeInsets padding;
  final Color? color;

  const NeumorphicButton({
    super.key,
    required this.child,
    required this.onTap,
    this.borderRadius = 12,
    this.padding = const EdgeInsets.all(16),
    this.color,
  });

  @override
  State<NeumorphicButton> createState() => _NeumorphicButtonState();
}

class _NeumorphicButtonState extends State<NeumorphicButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: widget.padding,
        decoration: _isPressed
            ? BoxDecoration(
                color: widget.color ?? TrippoTheme.backgroundColor,
                borderRadius: BorderRadius.circular(widget.borderRadius),
                boxShadow: [
                  BoxShadow(
                    color: TrippoTheme.lightShadowColor,
                    offset: const Offset(2, 2),
                    blurRadius: 5,
                    spreadRadius: 1,
                  ),
                  BoxShadow(
                    color: TrippoTheme.shadowColor,
                    offset: const Offset(-2, -2),
                    blurRadius: 5,
                    spreadRadius: 1,
                  ),
                ],
              )
            : NeumorphicDecoration.container(
                borderRadius: widget.borderRadius,
                color: widget.color ?? TrippoTheme.backgroundColor,
              ),
        child: widget.child,
      ),
    );
  }
}
