// ===========================================
// GEOLOCATION UTILITIES
// ===========================================

export interface GeoPoint {
    lat: number;
    lng: number;
}

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const lat1Rad = toRadians(point1.lat);
    const lat2Rad = toRadians(point2.lat);
    const deltaLat = toRadians(point2.lat - point1.lat);
    const deltaLng = toRadians(point2.lng - point1.lng);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

/**
 * Calculate speed between two points
 * @returns Speed in km/h
 */
export function calculateSpeed(
    point1: GeoPoint & { timestamp: Date },
    point2: GeoPoint & { timestamp: Date }
): number {
    const distance = calculateDistance(point1, point2);
    const timeDiffHours = Math.abs(
        point2.timestamp.getTime() - point1.timestamp.getTime()
    ) / (1000 * 60 * 60);

    if (timeDiffHours === 0) return 0;
    return distance / timeDiffHours;
}

/**
 * Check if a point is within a radius of another point
 */
export function isWithinRadius(
    center: GeoPoint,
    point: GeoPoint,
    radiusKm: number
): boolean {
    return calculateDistance(center, point) <= radiusKm;
}

/**
 * Calculate bearing between two points
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);
    const deltaLng = toRadians(to.lng - from.lng);

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = Math.atan2(x, y);
    bearing = toDegrees(bearing);
    bearing = (bearing + 360) % 360;

    return bearing;
}

/**
 * Get a new point at a given distance and bearing from a start point
 */
export function getDestinationPoint(
    start: GeoPoint,
    distanceKm: number,
    bearingDegrees: number
): GeoPoint {
    const lat1 = toRadians(start.lat);
    const lng1 = toRadians(start.lng);
    const bearing = toRadians(bearingDegrees);
    const angularDistance = distanceKm / EARTH_RADIUS_KM;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
    );

    const lng2 = lng1 + Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
        lat: toDegrees(lat2),
        lng: toDegrees(lng2),
    };
}

/**
 * Calculate bounding box around a point
 */
export function getBoundingBox(
    center: GeoPoint,
    radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const latOffset = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
    const lngOffset = radiusKm / (111.32 * Math.cos(toRadians(center.lat)));

    return {
        minLat: center.lat - latOffset,
        maxLat: center.lat + latOffset,
        minLng: center.lng - lngOffset,
        maxLng: center.lng + lngOffset,
    };
}

/**
 * Detect if location might be spoofed based on speed
 */
export function detectLocationJump(
    prevLocation: GeoPoint & { timestamp: Date },
    currLocation: GeoPoint & { timestamp: Date },
    maxSpeedKmh: number = 200
): { isJump: boolean; speed: number; distance: number } {
    const distance = calculateDistance(prevLocation, currLocation);
    const speed = calculateSpeed(prevLocation, currLocation);

    return {
        isJump: speed > maxSpeedKmh,
        speed,
        distance,
    };
}

/**
 * Check if GPS signal was lost (no updates for a threshold period)
 */
export function detectGPSSignalLoss(
    lastUpdate: Date,
    currentTime: Date,
    thresholdSeconds: number = 30
): { isLost: boolean; gapSeconds: number } {
    const gapSeconds = (currentTime.getTime() - lastUpdate.getTime()) / 1000;
    return {
        isLost: gapSeconds > thresholdSeconds,
        gapSeconds,
    };
}

// Helper functions
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
}

/**
 * Format coordinates for PostGIS query
 */
export function toPostGISPoint(point: GeoPoint): string {
    return `ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)`;
}

/**
 * Parse PostGIS point to GeoPoint
 */
export function fromPostGISPoint(pointString: string): GeoPoint | null {
    // Parse "POINT(lng lat)" format
    const match = pointString.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
        return {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2]),
        };
    }
    return null;
}
