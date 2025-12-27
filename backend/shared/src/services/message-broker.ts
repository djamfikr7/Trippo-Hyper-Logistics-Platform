import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger';

// ===========================================
// RABBITMQ MESSAGE BROKER SERVICE
// ===========================================

export interface QueueConfig {
    name: string;
    durable?: boolean;
    deadLetterExchange?: string;
    deadLetterRoutingKey?: string;
    messageTtl?: number;
}

export interface ExchangeConfig {
    name: string;
    type: 'direct' | 'topic' | 'fanout' | 'headers';
    durable?: boolean;
}

export class MessageBroker {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private readonly url: string;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 5000;

    constructor(url: string) {
        this.url = url;
    }

    async connect(): Promise<void> {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            this.reconnectAttempts = 0;

            logger.info('RabbitMQ connected');

            this.connection.on('error', (err) => {
                logger.error('RabbitMQ connection error', { error: err.message });
            });

            this.connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.handleReconnect();
            });

        } catch (error) {
            logger.error('Failed to connect to RabbitMQ', { error: (error as Error).message });
            this.handleReconnect();
        }
    }

    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
    }

    async disconnect(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            logger.info('RabbitMQ disconnected');
        } catch (error) {
            logger.error('Error disconnecting from RabbitMQ', { error: (error as Error).message });
        }
    }

    // ===========================================
    // QUEUE MANAGEMENT
    // ===========================================

    async assertQueue(config: QueueConfig): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const options: amqp.Options.AssertQueue = {
            durable: config.durable ?? true,
        };

        if (config.deadLetterExchange) {
            options.deadLetterExchange = config.deadLetterExchange;
        }
        if (config.deadLetterRoutingKey) {
            options.deadLetterRoutingKey = config.deadLetterRoutingKey;
        }
        if (config.messageTtl) {
            options.messageTtl = config.messageTtl;
        }

        await this.channel.assertQueue(config.name, options);
        logger.debug(`Queue "${config.name}" asserted`);
    }

    async assertExchange(config: ExchangeConfig): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        await this.channel.assertExchange(config.name, config.type, {
            durable: config.durable ?? true,
        });
        logger.debug(`Exchange "${config.name}" asserted`);
    }

    async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');
        await this.channel.bindQueue(queue, exchange, routingKey);
        logger.debug(`Queue "${queue}" bound to exchange "${exchange}" with key "${routingKey}"`);
    }

    // ===========================================
    // PUBLISHING
    // ===========================================

    async publish<T>(
        exchange: string,
        routingKey: string,
        message: T,
        options?: amqp.Options.Publish
    ): Promise<boolean> {
        if (!this.channel) throw new Error('Channel not initialized');

        const content = Buffer.from(JSON.stringify(message));
        const publishOptions: amqp.Options.Publish = {
            contentType: 'application/json',
            persistent: true,
            timestamp: Date.now(),
            ...options,
        };

        return this.channel.publish(exchange, routingKey, content, publishOptions);
    }

    async sendToQueue<T>(
        queue: string,
        message: T,
        options?: amqp.Options.Publish
    ): Promise<boolean> {
        if (!this.channel) throw new Error('Channel not initialized');

        const content = Buffer.from(JSON.stringify(message));
        const publishOptions: amqp.Options.Publish = {
            contentType: 'application/json',
            persistent: true,
            timestamp: Date.now(),
            ...options,
        };

        return this.channel.sendToQueue(queue, content, publishOptions);
    }

    // ===========================================
    // CONSUMING
    // ===========================================

    async consume<T>(
        queue: string,
        handler: (message: T, msg: ConsumeMessage) => Promise<void>,
        options?: amqp.Options.Consume
    ): Promise<string> {
        if (!this.channel) throw new Error('Channel not initialized');

        const consume = await this.channel.consume(
            queue,
            async (msg) => {
                if (!msg) return;

                try {
                    const content = JSON.parse(msg.content.toString()) as T;
                    await handler(content, msg);
                    this.channel?.ack(msg);
                } catch (error) {
                    logger.error(`Error processing message from ${queue}`, {
                        error: (error as Error).message,
                    });
                    // Reject and don't requeue (send to DLQ if configured)
                    this.channel?.nack(msg, false, false);
                }
            },
            {
                noAck: false,
                ...options,
            }
        );

        logger.info(`Consuming from queue: ${queue}`);
        return consume.consumerTag;
    }

    async cancelConsumer(consumerTag: string): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');
        await this.channel.cancel(consumerTag);
    }

    // ===========================================
    // ACKNOWLEDGEMENT
    // ===========================================

    ack(msg: ConsumeMessage): void {
        if (!this.channel) throw new Error('Channel not initialized');
        this.channel.ack(msg);
    }

    nack(msg: ConsumeMessage, requeue: boolean = false): void {
        if (!this.channel) throw new Error('Channel not initialized');
        this.channel.nack(msg, false, requeue);
    }

    // ===========================================
    // PREFETCH
    // ===========================================

    async setPrefetch(count: number): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');
        await this.channel.prefetch(count);
    }
}

// ===========================================
// PREDEFINED QUEUES & EXCHANGES
// ===========================================

export const EXCHANGES = {
    NOTIFICATIONS: { name: 'notifications', type: 'topic' as const },
    BOOKINGS: { name: 'bookings', type: 'topic' as const },
    TRACKING: { name: 'tracking', type: 'fanout' as const },
    FRAUD: { name: 'fraud', type: 'topic' as const },
    LOYALTY: { name: 'loyalty', type: 'topic' as const },
    PAYMENTS: { name: 'payments', type: 'topic' as const },
};

export const QUEUES = {
    // Notification queues
    PUSH_NOTIFICATIONS: { name: 'push-notifications', durable: true },
    SMS_NOTIFICATIONS: { name: 'sms-notifications', durable: true },
    EMAIL_NOTIFICATIONS: { name: 'email-notifications', durable: true },

    // Booking queues
    NEW_BOOKINGS: { name: 'new-bookings', durable: true },
    BOOKING_UPDATES: { name: 'booking-updates', durable: true },
    BOOKING_CANCELLATIONS: { name: 'booking-cancellations', durable: true },

    // Driver matching
    DRIVER_MATCHING: { name: 'driver-matching', durable: true },

    // Fraud detection
    FRAUD_ANALYSIS: { name: 'fraud-analysis', durable: true },
    GPS_ANOMALIES: { name: 'gps-anomalies', durable: true },

    // Loyalty
    POINTS_CALCULATION: { name: 'points-calculation', durable: true },
    TIER_UPDATES: { name: 'tier-updates', durable: true },

    // Payments
    PAYMENT_PROCESSING: { name: 'payment-processing', durable: true },
    REFUND_PROCESSING: { name: 'refund-processing', durable: true },
};

// ===========================================
// MESSAGE TYPES
// ===========================================

export interface NotificationMessage {
    type: 'push' | 'sms' | 'email';
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

export interface BookingMessage {
    event: 'created' | 'updated' | 'cancelled' | 'completed';
    requestId: string;
    customerId: string;
    driverId?: string;
    serviceType: string;
    timestamp: Date;
}

export interface DriverMatchingMessage {
    requestId: string;
    pickupLat: number;
    pickupLng: number;
    serviceType: string;
    vehicleType?: string;
    maxRadius: number;
}

export interface FraudAnalysisMessage {
    userId: string;
    requestId?: string;
    anomalyType: string;
    data: Record<string, unknown>;
    timestamp: Date;
}

export interface LoyaltyPointsMessage {
    userId: string;
    action: string;
    amount: number;
    referenceType: string;
    referenceId: string;
}

export interface PaymentMessage {
    action: 'process' | 'refund' | 'capture' | 'void';
    transactionId: string;
    userId: string;
    amount: number;
    currency: string;
    metadata: Record<string, unknown>;
}
