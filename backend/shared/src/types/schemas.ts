import { z } from 'zod';

// ===========================================
// AUTHENTICATION SCHEMAS
// ===========================================

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(10, 'Phone must be at least 10 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.email || data.phone, {
    message: 'Either email or phone is required',
});

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 characters'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
    languageCode: z.string().default('en'),
    referralCode: z.string().optional(),
});

export const verifyOTPSchema = z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    otp: z.string().length(6, 'OTP must be 6 digits'),
}).refine(data => data.email || data.phone, {
    message: 'Either email or phone is required',
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ===========================================
// USER SCHEMAS
// ===========================================

export const updateProfileSchema = z.object({
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    displayName: z.string().max(100).optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_say']).optional(),
    dateOfBirth: z.string().datetime().optional(),
    languageCode: z.string().max(10).optional(),
    notificationPreferences: z.object({
        push: z.boolean().optional(),
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
    }).optional(),
    privacySettings: z.object({
        shareLocation: z.boolean().optional(),
        showProfile: z.boolean().optional(),
    }).optional(),
});

export const updateLocationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
    accuracy: z.number().optional(),
    heading: z.number().optional(),
    speed: z.number().optional(),
});

// ===========================================
// DRIVER SCHEMAS
// ===========================================

export const createDriverProfileSchema = z.object({
    vehicleType: z.enum(['bicycle', 'motorcycle', 'scooter', 'car', 'van', 'truck_small', 'truck_medium', 'truck_large']),
    vehicleMake: z.string().max(100).optional(),
    vehicleModel: z.string().max(100).optional(),
    vehicleYear: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    vehicleColor: z.string().max(50).optional(),
    licensePlate: z.string().max(50),
    driverLicenseNumber: z.string().max(100),
    driverLicenseExpiry: z.string().datetime(),
    enabledServices: z.array(z.enum(['ride', 'food', 'freight', 'rescue', 'fix', 'money', 'courier'])).default(['ride']),
    maxPassengers: z.number().int().min(1).max(50).default(4),
});

export const updateDriverStatusSchema = z.object({
    isOnline: z.boolean().optional(),
    currentStatus: z.enum(['offline', 'available', 'busy', 'in_ride', 'on_delivery', 'break']).optional(),
});

// ===========================================
// BOOKING SCHEMAS
// ===========================================

const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
    instructions: z.string().optional(),
});

export const createRideRequestSchema = z.object({
    serviceType: z.enum(['ride']).default('ride'),
    serviceSubtype: z.string().optional(),
    pickup: locationSchema,
    dropoff: locationSchema,
    waypoints: z.array(locationSchema).max(3).optional(),
    vehicleType: z.enum(['bicycle', 'motorcycle', 'scooter', 'car', 'van']).optional(),
    paymentMethod: z.enum(['cash', 'card', 'wallet', 'corporate']).default('cash'),
    scheduledFor: z.string().datetime().optional(),
    details: z.object({
        passengers: z.number().int().min(1).max(8).default(1),
        childSeat: z.boolean().optional(),
        petFriendly: z.boolean().optional(),
        womenOnly: z.boolean().optional(),
        accessibility: z.boolean().optional(),
    }).optional(),
    discountCode: z.string().optional(),
});

export const createFoodOrderSchema = z.object({
    restaurantId: z.string().uuid(),
    items: z.array(z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
        options: z.record(z.string()).optional(),
        addons: z.array(z.string()).optional(),
        specialInstructions: z.string().optional(),
    })).min(1),
    deliveryAddress: locationSchema,
    paymentMethod: z.enum(['cash', 'card', 'wallet']).default('cash'),
    scheduledFor: z.string().datetime().optional(),
    customerInstructions: z.string().optional(),
    discountCode: z.string().optional(),
    tip: z.number().min(0).optional(),
});

export const createFreightRequestSchema = z.object({
    serviceType: z.enum(['freight']).default('freight'),
    pickup: locationSchema,
    dropoff: locationSchema,
    vehicleType: z.enum(['motorcycle', 'van', 'truck_small', 'truck_medium', 'truck_large']),
    paymentMethod: z.enum(['cash', 'card', 'wallet', 'corporate']).default('cash'),
    details: z.object({
        weight: z.number().positive(),
        dimensions: z.string().optional(),
        fragile: z.boolean().default(false),
        description: z.string(),
        insuranceValue: z.number().optional(),
    }),
    scheduledFor: z.string().datetime().optional(),
});

export const createMoneyDeliverySchema = z.object({
    serviceType: z.enum(['money']).default('money'),
    pickup: locationSchema,
    dropoff: locationSchema,
    paymentMethod: z.enum(['card', 'wallet']),
    details: z.object({
        amount: z.number().positive(),
        currency: z.string().length(3).default('USD'),
        purpose: z.string().optional(),
        recipientName: z.string(),
        recipientPhone: z.string().min(10),
        recipientIdType: z.string().optional(),
        recipientIdNumber: z.string().optional(),
    }),
});

export const cancelRequestSchema = z.object({
    reason: z.string().max(255),
});

export const rateRequestSchema = z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().max(1000).optional(),
    tips: z.number().min(0).optional(),
});

// ===========================================
// PAYMENT SCHEMAS
// ===========================================

export const addPaymentMethodSchema = z.object({
    methodType: z.enum(['card', 'bank_account', 'mobile_money', 'crypto']),
    cardNumber: z.string().optional(),
    cardExpMonth: z.number().int().min(1).max(12).optional(),
    cardExpYear: z.number().int().optional(),
    cardCvc: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    isDefault: z.boolean().default(false),
});

export const topUpWalletSchema = z.object({
    amount: z.number().positive(),
    paymentMethodId: z.string().uuid(),
});

export const withdrawWalletSchema = z.object({
    amount: z.number().positive(),
    bankAccountId: z.string().uuid().optional(),
    mobileMoneyNumber: z.string().optional(),
});

// ===========================================
// NEGOTIATION SCHEMAS
// ===========================================

export const createNegotiationSchema = z.object({
    requestId: z.string().uuid(),
    proposedPrice: z.number().positive(),
    terms: z.object({
        stops: z.number().int().optional(),
        waitTime: z.number().int().optional(),
        overnight: z.boolean().optional(),
        returnTrip: z.boolean().optional(),
    }).optional(),
    message: z.string().optional(),
});

export const respondNegotiationSchema = z.object({
    response: z.enum(['accept', 'reject', 'counter']),
    counterPrice: z.number().positive().optional(),
    counterTerms: z.object({
        stops: z.number().int().optional(),
        waitTime: z.number().int().optional(),
        overnight: z.boolean().optional(),
        returnTrip: z.boolean().optional(),
    }).optional(),
    message: z.string().optional(),
});

// ===========================================
// LOYALTY SCHEMAS
// ===========================================

export const redeemRewardSchema = z.object({
    rewardId: z.string().uuid(),
});

export const applyPromoCodeSchema = z.object({
    code: z.string().min(1),
    serviceType: z.enum(['ride', 'food', 'freight', 'rescue', 'fix', 'money', 'courier']),
    amount: z.number().positive(),
});

// ===========================================
// CHAT SCHEMAS
// ===========================================

export const sendMessageSchema = z.object({
    conversationId: z.string().uuid(),
    messageType: z.enum(['text', 'image', 'audio', 'location']).default('text'),
    content: z.string().min(1).max(5000),
    mediaUrl: z.string().url().optional(),
});

// ===========================================
// RESTAURANT SCHEMAS
// ===========================================

export const createRestaurantSchema = z.object({
    businessName: z.string().min(2).max(200),
    businessType: z.string().optional(),
    description: z.string().optional(),
    address: z.string().min(5),
    location: locationSchema,
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    cuisineTypes: z.array(z.string()),
    minimumOrder: z.number().min(0).default(0),
    deliveryFee: z.number().min(0).default(0),
    deliveryRadiusKm: z.number().min(1).max(50).default(5),
    avgPrepTimeMinutes: z.number().int().min(5).max(120).default(30),
});

export const createMenuItemSchema = z.object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(200),
    description: z.string().optional(),
    price: z.number().positive(),
    discountedPrice: z.number().positive().optional(),
    isVegetarian: z.boolean().default(false),
    isVegan: z.boolean().default(false),
    isHalal: z.boolean().default(false),
    allergens: z.array(z.string()).optional(),
    preparationTime: z.number().int().optional(),
    options: z.record(z.array(z.string())).optional(),
    addons: z.array(z.object({
        name: z.string(),
        price: z.number().min(0),
    })).optional(),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CreateDriverProfileInput = z.infer<typeof createDriverProfileSchema>;
export type CreateRideRequestInput = z.infer<typeof createRideRequestSchema>;
export type CreateFoodOrderInput = z.infer<typeof createFoodOrderSchema>;
export type CreateFreightRequestInput = z.infer<typeof createFreightRequestSchema>;
export type CreateMoneyDeliveryInput = z.infer<typeof createMoneyDeliverySchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
export type RateRequestInput = z.infer<typeof rateRequestSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type TopUpWalletInput = z.infer<typeof topUpWalletSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
