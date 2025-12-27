import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { loyaltyRoutes } from './routes/loyalty.routes';
import { errorHandler, requestLogger } from './middleware';
import { createLogger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import './workers/loyalty.worker'; // Start worker

dotenv.config();

const logger = createLogger('loyalty-service');
const app: Application = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(compression());
app.use(requestLogger);

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'loyalty-service' });
});

app.use('/api/loyalty', loyaltyRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await DatabaseService.initialize();
        app.listen(PORT, () => {
            logger.info(`Loyalty service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: (error as Error).message });
        process.exit(1);
    }
}

startServer();
