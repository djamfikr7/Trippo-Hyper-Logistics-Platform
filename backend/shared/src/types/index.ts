// ===========================================
// TRIPPO SHARED TYPES
// ===========================================

// User Types
export type UserGender = 'male' | 'female' | 'other' | 'prefer_not_say';
export type UserRole = 'rider' | 'driver' | 'restaurant' | 'merchant' | 'admin' | 'support';
export type VerificationLevel = 'unverified' | 'basic' | 'full' | 'premium';
export type TrustTier = 'restricted' | 'bronze' | 'silver' | 'gold' | 'platinum';
export type LoyaltyTier = 'basic' | 'bronze' | 'silver' | 'gold' | 'platinum';

// Driver Types
export type VehicleType = 'bicycle' | 'motorcycle' | 'scooter' | 'car' | 'van' | 'truck_small' | 'truck_medium' | 'truck_large';
export type DriverStatus = 'offline' | 'available' | 'busy' | 'in_ride' | 'on_delivery' | 'break';

// Service Types
export type ServiceType = 'ride' | 'food' | 'freight' | 'rescue' | 'fix' | 'money' | 'courier';
export type RequestStatus = 'pending' | 'searching' | 'driver_assigned' | 'accepted' | 'arrived' | 'started' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'expired' | 'disputed';
export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'corporate';
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

// Notification Types
export type NotificationType = 'push' | 'sms' | 'email' | 'in_app';
export type AdType = 'banner' | 'interstitial' | 'video' | 'native' | 'notification';
export type PricingModel = 'cpm' | 'cpc' | 'cpa';

// Fraud Types
export type FraudAnomalyType = 'gps_off' | 'jump_detected' | 'speed_exceeded' | 'altitude_change' | 'signal_loss' | 'mock_location';
export type MoneyDeliveryStatus = 'pending' | 'collected' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed';

// ===========================================
// ENTITY INTERFACES
// ===========================================

export interface Location {
    lat: number;
    lng: number;
    address?: string;
}

export interface User {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    gender?: UserGender;
    dateOfBirth?: Date;
    profileImageUrl?: string;
    coverImageUrl?: string;
    languageCode: string;
    supportedLanguages: string[];
    currentLocation?: Location;
    currentAddress?: string;
    verificationLevel: VerificationLevel;
    trustScore: number;
    trustTier: TrustTier;
    isBlacklisted: boolean;
    walletBalance: number;
    totalEarnings: number;
    totalSpent: number;
    currency: string;
    loyaltyPoints: number;
    loyaltyTier: LoyaltyTier;
    referralCode: string;
    referredBy?: string;
    totalTrips: number;
    totalOrders: number;
    totalDeliveries: number;
    avgRating: number;
    twoFactorEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

export interface DriverProfile {
    id: string;
    userId: string;
    isOnline: boolean;
    currentStatus: DriverStatus;
    lastOnline?: Date;
    vehicleType: VehicleType;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleColor?: string;
    licensePlate?: string;
    vehicleImageUrls: string[];
    enabledServices: ServiceType[];
    canDoMoneyDelivery: boolean;
    moneyDeliveryVerified: boolean;
    canDoLongTrips: boolean;
    canDoFemaleOnly: boolean;
    maxPassengers: number;
    maxWeightKg?: number;
    vehicleFeatures: string[];
    driverLicenseNumber?: string;
    driverLicenseExpiry?: Date;
    licenseImageUrl?: string;
    insuranceUrl?: string;
    registrationUrl?: string;
    workSchedule?: Record<string, string[]>;
    preferredAreas: string[];
    avoidAreas: string[];
    minimumFare: number;
    todayEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    totalEarnings: number;
    commissionRate: number;
    totalTrips: number;
    totalRides: number;
    totalDeliveries: number;
    acceptanceRate: number;
    cancellationRate: number;
    avgRating: number;
    isVerified: boolean;
    verifiedAt?: Date;
    autoAccept: boolean;
    acceptSharedRides: boolean;
    acceptScheduledRides: boolean;
    lastLocation?: Location;
    lastLocationTime?: Date;
    locationHistoryEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ServiceRequest {
    id: string;
    requestNumber: string;
    serviceType: ServiceType;
    serviceSubtype?: string;
    customerId: string;
    driverId?: string;
    dispatcherId?: string;
    pickupLocation: Location;
    pickupAddress: string;
    pickupInstructions?: string;
    dropoffLocation?: Location;
    dropoffAddress?: string;
    dropoffInstructions?: string;
    waypoints?: Location[];
    details: Record<string, unknown>;
    estimatedPrice: number;
    finalPrice?: number;
    priceBreakdown?: Record<string, number>;
    surgeMultiplier: number;
    discountAmount: number;
    discountCode?: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    transactionId?: string;
    status: RequestStatus;
    statusHistory: StatusHistoryEntry[];
    requestedAt: Date;
    scheduledFor?: Date;
    acceptedAt?: Date;
    arrivedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancelledBy?: 'customer' | 'driver' | 'system';
    cancellationReason?: string;
    cancellationFee: number;
    customerRating?: number;
    customerReview?: string;
    driverRating?: number;
    driverReview?: string;
    routePolyline?: string;
    distanceKm?: number;
    durationMinutes?: number;
    trafficDelayMinutes: number;
    fraudScore: number;
    fraudFlags: string[];
    integrityChecked: boolean;
    isNegotiable: boolean;
    negotiatedPrice?: number;
    negotiationHistory?: NegotiationEntry[];
    adShown: boolean;
    adRevenue: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface StatusHistoryEntry {
    status: RequestStatus;
    timestamp: Date;
    note?: string;
    changedBy?: string;
}

export interface NegotiationEntry {
    proposedBy: string;
    price: number;
    terms?: Record<string, unknown>;
    timestamp: Date;
}

export interface FoodOrder {
    id: string;
    requestId: string;
    restaurantId: string;
    items: FoodOrderItem[];
    subtotal: number;
    tax: number;
    deliveryFee: number;
    tip: number;
    total: number;
    restaurantStatus: 'received' | 'preparing' | 'ready' | 'delayed' | 'cancelled';
    estimatedPrepTime?: number;
    readyAt?: Date;
    customerInstructions?: string;
    restaurantInstructions?: string;
    packagingRequirements: string[];
    foodRating?: number;
    foodReview?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FoodOrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    options?: Record<string, string>;
    addons?: string[];
    specialInstructions?: string;
}

export interface MoneyDelivery {
    id: string;
    requestId: string;
    amount: number;
    currency: string;
    purpose?: string;
    securityCode: string;
    securityCodeExpiry: Date;
    recipientPhone: string;
    recipientName?: string;
    recipientIdType?: string;
    recipientIdNumber?: string;
    senderVerified: boolean;
    recipientVerified: boolean;
    verificationMethod?: string;
    transferFee: number;
    platformFee: number;
    insuranceFee: number;
    moneyStatus: MoneyDeliveryStatus;
    collectedAt?: Date;
    deliveredAt?: Date;
    collectedSignatureUrl?: string;
    deliveredSignatureUrl?: string;
    verificationAttempts: number;
    lastVerificationAttempt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyProgram {
    id: string;
    userId: string;
    totalPoints: number;
    availablePoints: number;
    usedPoints: number;
    expiredPoints: number;
    currentTier: LoyaltyTier;
    tierPoints: number;
    nextTierPoints?: number;
    unlockedRewards: string[];
    pendingRewards: PendingReward[];
    ridesThisMonth: number;
    deliveriesThisMonth: number;
    moneySpentThisMonth: number;
    totalReferrals: number;
    successfulReferrals: number;
    referralEarnings: number;
    loginStreak: number;
    lastLoginDate?: Date;
    rideStreak: number;
    createdAt: Date;
    updatedAt: Date;
    tierUpdatedAt?: Date;
}

export interface PendingReward {
    rewardId: string;
    earnedAt: Date;
    expiresAt: Date;
    claimed: boolean;
}

export interface LoyaltyReward {
    id: string;
    name: string;
    description?: string;
    pointsCost: number;
    tierRequired: LoyaltyTier;
    rewardType: 'discount' | 'free_ride' | 'cashback' | 'product' | 'vip_access' | 'subscription' | 'upgrade';
    rewardValue?: number;
    rewardDetails?: Record<string, unknown>;
    isActive: boolean;
    stockQuantity?: number;
    claimLimitPerUser: number;
    validFrom?: Date;
    validUntil?: Date;
    redemptionCode?: string;
    redemptionInstructions?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface RestaurantProfile {
    id: string;
    userId: string;
    businessName: string;
    businessType?: string;
    description?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    address: string;
    location: Location;
    deliveryRadiusKm: number;
    phone?: string;
    email?: string;
    website?: string;
    operatingHours?: Record<string, string[]>;
    isOpen: boolean;
    minimumOrder: number;
    deliveryFee: number;
    avgPrepTimeMinutes: number;
    cuisineTypes: string[];
    tags: string[];
    avgRating: number;
    totalReviews: number;
    totalOrders: number;
    isVerified: boolean;
    isFeatured: boolean;
    commissionRate: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface MenuItem {
    id: string;
    restaurantId: string;
    categoryId?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    discountedPrice?: number;
    options?: Record<string, string[]>;
    addons?: MenuAddon[];
    isVegetarian: boolean;
    isVegan: boolean;
    isHalal: boolean;
    allergens: string[];
    isAvailable: boolean;
    availableFrom?: string;
    availableUntil?: string;
    preparationTime?: number;
    totalOrders: number;
    avgRating?: number;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface MenuAddon {
    id: string;
    name: string;
    price: number;
}

export interface GPSAnomaly {
    id: string;
    userId: string;
    requestId?: string;
    anomalyType: FraudAnomalyType;
    expectedLocation?: Location;
    actualLocation?: Location;
    distanceDiffMeters?: number;
    timeDiffSeconds?: number;
    deviceId?: string;
    gpsProvider?: string;
    locationAccuracy?: number;
    confidenceScore: number;
    detectionMethod?: string;
    isConfirmedFraud: boolean;
    autoActions: string[];
    manualReviewStatus: 'pending' | 'reviewed' | 'dismissed';
    reviewerNotes?: string;
    reviewedBy?: string;
    detectedAt: Date;
    resolvedAt?: Date;
}

export interface ChatConversation {
    id: string;
    requestId?: string;
    participants: string[];
    conversationType: 'trip' | 'support' | 'group' | 'direct';
    lastMessageAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    messageType: 'text' | 'image' | 'audio' | 'location' | 'system';
    content: string;
    mediaUrl?: string;
    readBy: string[];
    flaggedForReview: boolean;
    flagReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WalletTransaction {
    id: string;
    userId: string;
    transactionType: 'credit' | 'debit' | 'hold' | 'release' | 'refund';
    amount: number;
    currency: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    balanceBefore: number;
    balanceAfter: number;
    status: 'pending' | 'completed' | 'failed' | 'reversed';
    externalTransactionId?: string;
    paymentGateway?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PricingRule {
    id: string;
    serviceType: ServiceType;
    vehicleType?: VehicleType;
    baseFare: number;
    perKmRate: number;
    perMinuteRate: number;
    minimumFare: number;
    surgeEnabled: boolean;
    maxSurgeMultiplier: number;
    peakHours?: Record<string, string[]>;
    peakMultiplier: number;
    applicableZones: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PromoCode {
    id: string;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed' | 'free_delivery';
    discountValue: number;
    maxDiscount?: number;
    minimumOrder: number;
    appliesTo: ServiceType[];
    userTierRequired?: LoyaltyTier;
    firstOrderOnly: boolean;
    maxUses?: number;
    maxUsesPerUser: number;
    currentUses: number;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
