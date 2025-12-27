import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { bookingRoutes } from './routes/booking.routes';
import { errorHandler, requestLogger } from './middleware';
import { createLogger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { MessageBrokerService } from './services/message-broker.service';

// Load environment variables
dotenv.config();

const logger = createLogger('booking-service');

const app: Application = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(compression());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'booking-service' });
});

// Routes
app.use('/api/bookings', bookingRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await DatabaseService.initialize();
        await RedisService.connect();
        await MessageBrokerService.initialize();

        app.listen(PORT, () => {
            logger.info(`Booking service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: (error as Error).message });
        process.exit(1);
    }
}

startServer();
