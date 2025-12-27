import 'package:flutter/material.dart';
import '../theme/trippo_theme.dart';

class NeumorphicCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsets padding;
  final Color? color;
  final double? width;
  final double? height;

  const NeumorphicCard({
    super.key,
    required this.child,
    this.borderRadius = 16,
    this.padding = const EdgeInsets.all(20),
    this.color,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      padding: padding,
      decoration: NeumorphicDecoration.container(
        borderRadius: borderRadius,
        color: color ?? TrippoTheme.backgroundColor,
      ),
      child: child,
    );
  }
}
