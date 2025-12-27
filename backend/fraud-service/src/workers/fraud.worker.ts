import dotenv from 'dotenv';
import {
    MessageBroker,
    QUEUES,
    EXCHANGES
} from '../../shared/src/services/message-broker';
import { detectLocationJump } from '../../shared/src/utils/geo';
import { RedisService } from '../../shared/src/services/redis';
import { DatabaseService } from '../services/database.service';
import { createLogger } from '../utils/logger';

dotenv.config();
const logger = createLogger('fraud-worker');

async function startWorker() {
    try {
        const brokerUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        const broker = new MessageBroker(brokerUrl);
        await broker.connect();

        const redis = new RedisService(process.env.REDIS_URL || 'redis://localhost:6379');
        await redis.connect();

        await DatabaseService.initialize();

        logger.info('Fraud Detection Worker started');

        // Subscribe to tracking fanout exchange
        // Note: We need a temporary queue for this fanout
        const queueName = 'fraud-tracking-monitor';
        const channel = (broker as any).channel;
        await channel.assertQueue(queueName, { exclusive: true });
        await channel.bindQueue(queueName, EXCHANGES.TRACKING.name, '');

        await channel.consume(queueName, async (msg: any) => {
            if (!msg) return;
            const data = JSON.parse(msg.content.toString());
            const { userId, lat, lng, timestamp } = data;

            // 1. Get previous location from Redis
            const prevLocKey = `tracking:prev:${userId}`;
            const prevLoc = await redis.getJSON<{ lat: number, lng: number, timestamp: string }>(prevLocKey);

            if (prevLoc) {
                // 2. Detect Jump
                const anomaly = detectLocationJump(
                    { lat: prevLoc.lat, lng: prevLoc.lng, timestamp: new Date(prevLoc.timestamp) },
                    { lat, lng, timestamp: new Date(timestamp) }
                );

                if (anomaly.isJump) {
                    logger.warn('GPS Jump detected!', { userId, speed: anomaly.speed, distance: anomaly.distance });

                    // 3. Log anomaly in DB
                    await DatabaseService.query(
                        `INSERT INTO gps_anomalies (
              user_id, anomaly_type, actual_location, confidence_score
            ) VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)`,
                        [userId, 'jump_detected', lng, lat, 100] // Confidence 100 for obvious jumps
                    );

                    // 4. Penalize trust score
                    await DatabaseService.query(
                        'UPDATE users SET trust_score = GREATEST(0, trust_score - 5) WHERE id = $1',
                        [userId]
                    );

                    // 5. Notify Fraud exchange
                    await broker.publish(EXCHANGES.FRAUD.name, 'anomaly.detected', {
                        userId,
                        anomalyType: 'jump_detected',
                        details: anomaly
                    });
                }
            }

            // 6. Store current location as previous for next check
            await redis.setJSON(prevLocKey, { lat, lng, timestamp }, 600); // 10 min TTL

            channel.ack(msg);
        });

    } catch (error) {
        logger.error('Fraud Worker failed', { error: (error as Error).message });
        process.exit(1);
    }
}

startWorker();
