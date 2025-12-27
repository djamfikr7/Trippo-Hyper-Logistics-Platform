import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { errorHandler, requestLogger } from './middleware';
import { createLogger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';

// Load environment variables
dotenv.config();

const logger = createLogger('auth-service');

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// ===========================================
// MIDDLEWARE
// ===========================================

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// ===========================================
// ROUTES
// ===========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ===========================================
// START SERVER
// ===========================================

async function startServer() {
    try {
        // Initialize database
        await DatabaseService.initialize();
        logger.info('Database connected');

        // Initialize Redis
        await RedisService.connect();
        logger.info('Redis connected');

        // Start listening
        app.listen(PORT, () => {
            logger.info(`Auth service running on port ${PORT}`);
        });

    } catch (error) {
        logger.error('Failed to start server', { error: (error as Error).message });
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await DatabaseService.close();
    await RedisService.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await DatabaseService.close();
    await RedisService.disconnect();
    process.exit(0);
});

startServer();

export default app;
