import { DatabaseService } from './database.service';
import { MessageBrokerService } from './message-broker.service';
import {
    CreateRideRequestInput
} from '../../../shared/src/types/schemas';
import {
    generateRequestNumber
} from '../../../shared/src/utils/crypto';
import {
    toPostGISPoint
} from '../../../shared/src/utils/geo';
import { logger } from '../utils/logger';

export class BookingService {

    static async createRideRequest(userId: string, input: CreateRideRequestInput) {
        // 1. Calculate estimated price (simplified for now)
        const baseFare = 5.0;
        const estimatedPrice = baseFare; // Will integrate with Routing service later

        const requestNumber = generateRequestNumber('RI');

        // 2. Save to database
        const result = await DatabaseService.query(
            `INSERT INTO service_requests (
        request_number, service_type, customer_id, 
        pickup_location, pickup_address, 
        dropoff_location, dropoff_address,
        estimated_price, payment_method, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id, request_number, status`,
            [
                requestNumber,
                'ride',
                userId,
                toPostGISPoint(input.pickup),
                input.pickup.address,
                input.dropoff ? toPostGISPoint(input.dropoff) : null,
                input.dropoff?.address,
                estimatedPrice,
                input.paymentMethod,
                'searching'
            ]
        );

        const booking = result.rows[0];

        // 3. Emit matching task
        await MessageBrokerService.requestDriverMatching({
            requestId: booking.id,
            pickup: input.pickup,
            serviceType: 'ride',
            timestamp: new Date()
        });

        // 4. Publish booking event
        await MessageBrokerService.publishBookingEvent('booking.created', {
            requestId: booking.id,
            customerId: userId,
            status: 'searching'
        });

        logger.info('Ride request created', { requestId: booking.id, requestNumber });

        return booking;
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
