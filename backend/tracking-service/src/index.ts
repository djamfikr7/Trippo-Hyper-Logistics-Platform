import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { RedisService } from '../../shared/src/services/redis';
import {
    MessageBroker,
    EXCHANGES
} from '../../shared/src/services/message-broker';
import { createLogger } from './utils/logger';

dotenv.config();
const logger = createLogger('tracking-service');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

const redis = new RedisService(process.env.REDIS_URL || 'redis://localhost:6379');
const broker = new MessageBroker(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');

// ===========================================
// WEBSOCKET AUTHENTICATION
// ===========================================

io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
        return next(new Error('Authentication error'));
    }

    try {
        const decoded = jwt.verify(token as string, JWT_SECRET) as any;
        (socket as any).userId = decoded.userId;
        (socket as any).roles = decoded.roles;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// ===========================================
// SOCKET HANDLERS
// ===========================================

io.on('connection', (socket: any) => {
    logger.info('New socket connection', { userId: socket.userId });

    // 1. Handle location updates from drivers
    socket.on('update_location', async (data: { lat: number, lng: number, heading?: number, speed?: number, requestId?: string }) => {
        const { lat, lng, requestId } = data;

        // Update Redis for matching and real-time retrieval
        await redis.updateDriverLocation(socket.userId, lng, lat);

        // If driver is currently on a trip, broadcast specifically to that trip room
        if (requestId) {
            socket.to(`trip:${requestId}`).emit('driver_location', {
                driverId: socket.userId,
                lat,
                lng,
                heading: data.heading,
                speed: data.speed,
                timestamp: new Date()
            });
        }

        // Emit event for fraud detection and other services
        await broker.publish(EXCHANGES.TRACKING.name, '', {
            userId: socket.userId,
            lat,
            lng,
            requestId,
            timestamp: new Date()
        });
    });

    // 2. Join a trip room for live tracking
    socket.on('join_trip', (data: { requestId: string }) => {
        socket.join(`trip:${data.requestId}`);
        logger.info('User joined trip room', { userId: socket.userId, requestId: data.requestId });
    });

    socket.on('disconnect', () => {
        logger.info('Socket disconnected', { userId: socket.userId });
    });
});

async function startServer() {
    await redis.connect();
    await broker.connect();

    const PORT = process.env.PORT || 3003;
    httpServer.listen(PORT, () => {
        logger.info(`Tracking service running on port ${PORT}`);
    });
}

startServer();
