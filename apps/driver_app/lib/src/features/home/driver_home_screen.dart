import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_core/shared_core.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _isOnline = false;
  final LatLng _currentLocation = const LatLng(33.9800, -6.8400); // Slightly different for driver
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Map
          FlutterMap(
            options: MapOptions(
              center: _currentLocation,
              zoom: 14,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentLocation,
                    builder: (ctx) => Icon(
                      Icons.navigation,
                      color: _isOnline ? Colors.green : Colors.grey,
                      size: 40,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // 2. Status Bar
          Positioned(
            top: 60,
            left: 20,
            right: 20,
            child: NeumorphicCard(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              borderRadius: 30,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isOnline ? Colors.green : Colors.red,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isOnline ? 'Online' : 'Offline',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Switch(
                    value: _isOnline,
                    onChanged: (val) {
                      setState(() => _isOnline = val);
                    },
                    activeColor: TrippoTheme.primaryColor,
                  ),
                ],
              ),
            ),
          ),

          // 3. Stats Panel
          if (!_isOnline)
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: NeumorphicCard(
              child: Column(
                children: [
                  const Text(
                    'Today\'s Summary',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: const [
                      _StatItem(label: 'Earnings', value: '$0.00'),
                      _StatItem(label: 'Trips', value: '0'),
                      _StatItem(label: 'Hours', value: '0.0'),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // 4. Floating Action for Profile
          Positioned(
            bottom: 40,
            right: 20,
            child: NeumorphicButton(
              onTap: () {},
              borderRadius: 30,
              padding: const EdgeInsets.all(16),
              child: const Icon(Icons.person),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;

  const _StatItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: TrippoTheme.primaryColor)),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }
}
