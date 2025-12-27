import dotenv from 'dotenv';
import {
    MessageBroker,
    QUEUES,
    BookingMessage
} from '../../shared/src/services/message-broker';
import { DatabaseService } from '../services/database.service';
import { createLogger } from '../utils/logger';

dotenv.config();
const logger = createLogger('loyalty-worker');

async function startWorker() {
    try {
        const brokerUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        const broker = new MessageBroker(brokerUrl);
        await broker.connect();

        await DatabaseService.initialize();

        logger.info('Loyalty Worker started');

        await broker.consume<BookingMessage>(
            QUEUES.BOOKING_UPDATES.name, // Adjust if needed
            async (message) => {
                if (message.event !== 'completed') return;

                logger.info('Processing loyalty points for booking', { requestId: message.requestId });

                // Calculate points (1 point per dollar spent)
                // In real app, we'd fetch the final price first
                const bookingResult = await DatabaseService.query(
                    'SELECT customer_id, final_price FROM service_requests WHERE id = $1',
                    [message.requestId]
                );

                if (bookingResult.rowCount === 0) return;

                const { customer_id, final_price } = bookingResult.rows[0];
                const pointsToAward = Math.floor(final_price || 0);

                if (pointsToAward <= 0) return;

                // Award points in transaction
                await DatabaseService.transaction(async (client) => {
                    // Update user points
                    await client.query(
                        'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
                        [pointsToAward, customer_id]
                    );

                    // Update loyalty program status
                    await client.query(
                        'UPDATE loyalty_program SET total_points = total_points + $1, available_points = available_points + $1 WHERE user_id = $2',
                        [pointsToAward, customer_id]
                    );

                    logger.info('Awarded loyalty points', { userId: customer_id, points: pointsToAward });
                });
            }
        );

    } catch (error) {
        logger.error('Loyalty Worker failed', { error: (error as Error).message });
        process.exit(1);
    }
}

startWorker();
