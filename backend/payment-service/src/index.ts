import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { paymentRoutes } from './routes/payment.routes';
import { errorHandler, requestLogger } from './middleware';
import { createLogger } from './utils/logger';
import { DatabaseService } from './services/database.service';

dotenv.config();

const logger = createLogger('payment-service');
const app: Application = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(compression());
app.use(requestLogger);

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'payment-service' });
});

app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await DatabaseService.initialize();
        app.listen(PORT, () => {
            logger.info(`Payment service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: (error as Error).message });
        process.exit(1);
    }
}

startServer();
