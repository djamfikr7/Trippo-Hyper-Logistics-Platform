import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_core/shared_core.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MapController _mapController = MapController();
  final LatLng _initialLocation = const LatLng(33.9716, -6.8498); // Rabat

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Map Layer
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(center: _initialLocation, zoom: 15),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.trippo.rider_app',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _initialLocation,
                    builder: (ctx) => const Icon(
                      Icons.person_pin_circle,
                      color: TrippoTheme.primaryColor,
                      size: 40,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // 2. Search / Request Panel (Neomorphic)
          Positioned(
            left: 20,
            right: 20,
            bottom: 40,
            child: NeumorphicCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const NeumorphicTextField(
                    hintText: 'Where to?',
                    prefixIcon: Icons.search,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _ServiceCard(
                          icon: Icons.ride_sharing,
                          label: 'Ride',
                          isSelected: true,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _ServiceCard(
                          icon: Icons.fastfood,
                          label: 'Food',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _ServiceCard(
                          icon: Icons.local_shipping,
                          label: 'Freight',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  NeumorphicButton(
                    onTap: () {
                      // TODO: Start booking flow
                    },
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    color: TrippoTheme.primaryColor,
                    child: const Center(
                      child: Text(
                        'Confirm Trip',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. User Toolbar
          Positioned(
            top: 60,
            left: 20,
            child: NeumorphicButton(
              onTap: () {},
              padding: const EdgeInsets.all(12),
              borderRadius: 30,
              child: const Icon(Icons.menu),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;

  const _ServiceCard({
    required this.icon,
    required this.label,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: isSelected
          ? NeumorphicDecoration.inner(
              color: TrippoTheme.primaryColor.withOpacity(0.1),
            )
          : null,
      child: Column(
        children: [
          Icon(
            icon,
            color: isSelected ? TrippoTheme.primaryColor : Colors.grey,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isSelected ? TrippoTheme.primaryColor : Colors.grey,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
