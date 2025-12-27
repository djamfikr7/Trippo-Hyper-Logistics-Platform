import dotenv from 'dotenv';
import {
    MessageBroker,
    QUEUES,
    EXCHANGES,
    DriverMatchingMessage
} from '../../shared/src/services/message-broker';
import { RedisService } from '../../shared/src/services/redis';
import { DatabaseService } from '../services/database.service';
import { createLogger } from '../utils/logger';

dotenv.config();
const logger = createLogger('matching-worker');

async function startWorker() {
    try {
        const brokerUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        const broker = new MessageBroker(brokerUrl);
        await broker.connect();

        const redis = new RedisService(redisUrl);
        await redis.connect();

        await DatabaseService.initialize();

        logger.info('Matching Worker started');

        await broker.consume<DriverMatchingMessage>(
            QUEUES.DRIVER_MATCHING.name,
            async (message) => {
                logger.info('Processing matching request', { requestId: message.requestId });

                // 1. Find nearby drivers using Redis Geo
                const radius = message.maxRadius || 5; // Default 5km
                const nearbyDrivers = await redis.getNearbyDrivers(
                    message.pickupLng,
                    message.pickupLat,
                    radius,
                    message.serviceType
                );

                if (nearbyDrivers.length === 0) {
                    logger.warn('No drivers found nearby', { requestId: message.requestId });
                    // In real app, we might retry with larger radius or notify customer
                    return;
                }

                logger.info(`Found ${nearbyDrivers.length} nearby drivers`, { requestId: message.requestId });

                // 2. Filter drivers (check if they are really online and not busy in DB)
                // This is a second layer of check
                const driverIds = nearbyDrivers.map(d => d.driverId);
                const availableDriversResult = await DatabaseService.query(
                    `SELECT user_id FROM driver_profiles 
           WHERE user_id = ANY($1) 
           AND is_online = TRUE 
           AND current_status = 'available'`,
                    [driverIds]
                );

                const availableDriverIds = availableDriversResult.rows.map(r => r.user_id);

                if (availableDriverIds.length === 0) {
                    logger.warn('Nearby drivers are busy or offline', { requestId: message.requestId });
                    return;
                }

                // 3. Select best driver (for now, just the closest one)
                // In a real app, we'd use trust score, rating, etc.
                const bestDriverId = availableDriverIds[0];

                // 4. Update booking status to 'driver_assigned' (or similar)
                await DatabaseService.query(
                    `UPDATE service_requests 
           SET status = 'driver_assigned', driver_id = $1 
           WHERE id = $2`,
                    [bestDriverId, message.requestId]
                );

                // 5. Notify the booking service and notification service
                await broker.publish(EXCHANGES.BOOKINGS.name, 'booking.assigned', {
                    requestId: message.requestId,
                    driverId: bestDriverId
                });

                // 6. Notify the driver (this would trigger a Push or Socket notification)
                await broker.publish(EXCHANGES.NOTIFICATIONS.name, 'driver.new_request', {
                    userId: bestDriverId,
                    requestId: message.requestId,
                    type: 'push'
                });

                logger.info('Driver matched and assigned', { requestId: message.requestId, driverId: bestDriverId });
            }
        );

    } catch (error) {
        logger.error('Matching Worker failed', { error: (error as Error).message });
        process.exit(1);
    }
}

startWorker();
