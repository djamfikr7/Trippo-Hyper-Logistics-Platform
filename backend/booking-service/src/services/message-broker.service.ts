import {
    MessageBroker,
    EXCHANGES,
    QUEUES
} from '../../../shared/src/services/message-broker';
import { createLogger } from '../utils/logger';

const logger = createLogger('message-broker');

class MessageBrokerServiceClass {
    private broker: MessageBroker | null = null;

    async initialize(): Promise<void> {
        const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        this.broker = new MessageBroker(url);
        await this.broker.connect();

        // Setup exchanges
        await this.broker.assertExchange(EXCHANGES.BOOKINGS);

        // Setup queues
        await this.broker.assertQueue(QUEUES.NEW_BOOKINGS);
        await this.broker.assertQueue(QUEUES.DRIVER_MATCHING);

        // Bindings
        await this.broker.bindQueue(
            QUEUES.NEW_BOOKINGS.name,
            EXCHANGES.BOOKINGS.name,
            'booking.created'
        );

        logger.info('Message Broker initialized for Booking Service');
    }

    getBroker(): MessageBroker {
        if (!this.broker) throw new Error('Message broker not initialized');
        return this.broker;
    }

    async publishBookingEvent(event: string, data: any) {
        return this.getBroker().publish(EXCHANGES.BOOKINGS.name, event, data);
    }

    async requestDriverMatching(data: any) {
        return this.getBroker().sendToQueue(QUEUES.DRIVER_MATCHING.name, data);
    }
}

export const MessageBrokerService = new MessageBrokerServiceClass();
