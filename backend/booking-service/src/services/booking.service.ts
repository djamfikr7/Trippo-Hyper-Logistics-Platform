import { DatabaseService } from './database.service';
import { MessageBrokerService } from './message-broker.service';
import {
    CreateRideRequestInput,
    CreateFoodOrderInput,
    CreateFreightRequestInput,
    CreateMoneyDeliveryInput
} from '../../../shared/src/types/schemas';
import {
    generateRequestNumber,
    generateSecureCode
} from '../../../shared/src/utils/crypto';
import {
    toPostGISPoint
} from '../../../shared/src/utils/geo';
import { logger } from '../utils/logger';

export class BookingService {

    // ===========================================
    // RIDE-HAILING
    // ===========================================
    static async createRideRequest(userId: string, input: CreateRideRequestInput) {
        const baseFare = 5.0; // Dynamic pricing would go here
        const requestNumber = generateRequestNumber('RI');

        return await DatabaseService.transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO service_requests (
          request_number, service_type, customer_id, 
          pickup_location, pickup_address, 
          dropoff_location, dropoff_address,
          estimated_price, payment_method, status, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING id, request_number, status`,
                [
                    requestNumber, 'ride', userId,
                    toPostGISPoint(input.pickup), input.pickup.address,
                    input.dropoff ? toPostGISPoint(input.dropoff) : null, input.dropoff?.address,
                    baseFare, input.paymentMethod, 'searching',
                    JSON.stringify(input.details || {})
                ]
            );

            const booking = result.rows[0];

            await MessageBrokerService.requestDriverMatching({
                requestId: booking.id, pickup: input.pickup, serviceType: 'ride', timestamp: new Date()
            });

            return booking;
        });
    }

    // ===========================================
    // FOOD DELIVERY
    // ===========================================
    static async createFoodOrder(userId: string, input: CreateFoodOrderInput) {
        const requestNumber = generateRequestNumber('FD');

        return await DatabaseService.transaction(async (client) => {
            // 1. Create base service request
            const requestResult = await client.query(
                `INSERT INTO service_requests (
          request_number, service_type, customer_id, 
          pickup_location, pickup_address, 
          dropoff_location, dropoff_address,
          estimated_price, payment_method, status
        ) VALUES ($1, $2, $3, (SELECT location FROM restaurant_profiles WHERE id = $4), 
                  (SELECT address FROM restaurant_profiles WHERE id = $4), $5, $6, $7, $8, $9) 
        RETURNING id`,
                [
                    requestNumber, 'food', userId, input.restaurantId,
                    toPostGISPoint(input.deliveryAddress), input.deliveryAddress.address,
                    15.0, // Calculated total
                    input.paymentMethod, 'pending'
                ]
            );

            const requestId = requestResult.rows[0].id;

            // 2. Create food order record
            const orderResult = await client.query(
                `INSERT INTO food_orders (
          request_id, restaurant_id, items, total, customer_instructions
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [requestId, input.restaurantId, JSON.stringify(input.items), 15.0, input.customerInstructions]
            );

            await MessageBrokerService.publishBookingEvent('food.created', {
                requestId, orderId: orderResult.rows[0].id, restaurantId: input.restaurantId
            });

            return { requestId, orderId: orderResult.rows[0].id, requestNumber };
        });
    }

    // ===========================================
    // MONEY DELIVERY
    // ===========================================
    static async createMoneyDelivery(userId: string, input: CreateMoneyDeliveryInput) {
        const requestNumber = generateRequestNumber('MD');
        const securityCode = generateSecureCode(6).toUpperCase();

        return await DatabaseService.transaction(async (client) => {
            const requestResult = await client.query(
                `INSERT INTO service_requests (
          request_number, service_type, customer_id, 
          pickup_location, pickup_address, 
          dropoff_location, dropoff_address,
          estimated_price, payment_method, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING id`,
                [
                    requestNumber, 'money', userId,
                    toPostGISPoint(input.pickup), input.pickup.address,
                    toPostGISPoint(input.dropoff), input.dropoff.address,
                    input.details.amount * 0.05 + 2.0, // 5% fee + base
                    'wallet', 'pending'
                ]
            );

            const requestId = requestResult.rows[0].id;

            await client.query(
                `INSERT INTO money_deliveries (
          request_id, amount, currency, security_code, recipient_phone, recipient_name
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    requestId, input.details.amount, input.details.currency, securityCode,
                    input.details.recipientPhone, input.details.recipientName
                ]
            );

            await MessageBrokerService.requestDriverMatching({
                requestId, pickup: input.pickup, serviceType: 'money', timestamp: new Date()
            });

            return { requestId, requestNumber, securityCode };
        });
    }

    // ===========================================
    // FREIGHT & COURIER
    // ===========================================
    static async createFreightRequest(userId: string, input: CreateFreightRequestInput) {
        const requestNumber = generateRequestNumber('FR');

        const result = await DatabaseService.query(
            `INSERT INTO service_requests (
        request_number, service_type, customer_id, 
        pickup_location, pickup_address, 
        dropoff_location, dropoff_address,
        estimated_price, payment_method, details, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING id, request_number`,
            [
                requestNumber, 'freight', userId,
                toPostGISPoint(input.pickup), input.pickup.address,
                toPostGISPoint(input.dropoff), input.dropoff.address,
                50.0, input.paymentMethod, JSON.stringify(input.details), 'searching'
            ]
        );

        await MessageBrokerService.requestDriverMatching({
            requestId: result.rows[0].id, pickup: input.pickup, serviceType: 'freight', timestamp: new Date()
        });

        return result.rows[0];
    }

    // ===========================================
    // RESCUE & MECHANIC (Fix)
    // ===========================================
    static async createEmergencyRequest(userId: string, serviceType: 'rescue' | 'fix', location: any) {
        const requestNumber = generateRequestNumber(serviceType === 'rescue' ? 'RS' : 'FX');

        const result = await DatabaseService.query(
            `INSERT INTO service_requests (
        request_number, service_type, customer_id, 
        pickup_location, pickup_address, status
      ) VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, request_number`,
            [
                requestNumber, serviceType, userId,
                toPostGISPoint(location), location.address || 'Emergency Location', 'searching'
            ]
        );

        await MessageBrokerService.requestDriverMatching({
            requestId: result.rows[0].id, pickup: location, serviceType, timestamp: new Date()
        });

        return result.rows[0];
    }

    static async getBookingDetails(bookingId: string) {
        const result = await DatabaseService.query(
            'SELECT * FROM service_requests WHERE id = $1',
            [bookingId]
        );
        return result.rows[0];
    }

    static async cancelBooking(bookingId: string, userId: string, reason: string) {
        const result = await DatabaseService.query(
            `UPDATE service_requests 
       SET status = 'cancelled', cancellation_reason = $1, cancelled_at = NOW(), cancelled_by = 'customer'
       WHERE id = $2 AND customer_id = $3 AND status IN ('searching', 'driver_assigned', 'accepted')
       RETURNING id, status`,
            [reason, bookingId, userId]
        );

        if (result.rowCount === 0) {
            throw new Error('Booking cannot be cancelled');
        }

        await MessageBrokerService.publishBookingEvent('booking.cancelled', {
            requestId: bookingId,
            cancelledBy: userId,
            reason
        });

        return result.rows[0];
    }
}
