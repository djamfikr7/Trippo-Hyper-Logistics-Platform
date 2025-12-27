import Redis from 'ioredis';
import { logger } from '../utils/logger';

// ===========================================
// REDIS SERVICE
// ===========================================

export class RedisService {
    private client: Redis;
    private subscriber: Redis;
    private isConnected: boolean = false;

    constructor(redisUrl: string) {
        this.client = new Redis(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });

        this.subscriber = new Redis(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info('Redis connected');
        });

        this.client.on('error', (err) => {
            logger.error('Redis error', { error: err.message });
        });

        this.client.on('close', () => {
            this.isConnected = false;
            logger.warn('Redis connection closed');
        });
    }

    async connect(): Promise<void> {
        await this.client.connect();
        await this.subscriber.connect();
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
        await this.subscriber.quit();
    }

    // ===========================================
    // BASIC OPERATIONS
    // ===========================================

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<number> {
        return this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    async expire(key: string, seconds: number): Promise<void> {
        await this.client.expire(key, seconds);
    }

    async ttl(key: string): Promise<number> {
        return this.client.ttl(key);
    }

    // ===========================================
    // JSON OPERATIONS
    // ===========================================

    async getJSON<T>(key: string): Promise<T | null> {
        const value = await this.get(key);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }

    // ===========================================
    // HASH OPERATIONS
    // ===========================================

    async hget(key: string, field: string): Promise<string | null> {
        return this.client.hget(key, field);
    }

    async hset(key: string, field: string, value: string): Promise<void> {
        await this.client.hset(key, field, value);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.client.hgetall(key);
    }

    async hdel(key: string, ...fields: string[]): Promise<number> {
        return this.client.hdel(key, ...fields);
    }

    // ===========================================
    // SET OPERATIONS
    // ===========================================

    async sadd(key: string, ...members: string[]): Promise<number> {
        return this.client.sadd(key, ...members);
    }

    async srem(key: string, ...members: string[]): Promise<number> {
        return this.client.srem(key, ...members);
    }

    async smembers(key: string): Promise<string[]> {
        return this.client.smembers(key);
    }

    async sismember(key: string, member: string): Promise<boolean> {
        const result = await this.client.sismember(key, member);
        return result === 1;
    }

    // ===========================================
    // SORTED SET OPERATIONS (For geolocation)
    // ===========================================

    async zadd(key: string, score: number, member: string): Promise<number> {
        return this.client.zadd(key, score, member);
    }

    async zrem(key: string, member: string): Promise<number> {
        return this.client.zrem(key, member);
    }

    async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
        return this.client.zrangebyscore(key, min, max);
    }

    // ===========================================
    // GEO OPERATIONS (For driver location tracking)
    // ===========================================

    async geoadd(key: string, lng: number, lat: number, member: string): Promise<number> {
        return this.client.geoadd(key, lng, lat, member);
    }

    async geopos(key: string, member: string): Promise<[string, string] | null> {
        const result = await this.client.geopos(key, member);
        return result[0] as [string, string] | null;
    }

    async georadius(
        key: string,
        lng: number,
        lat: number,
        radius: number,
        unit: 'km' | 'm' = 'km',
        options?: { withCoord?: boolean; withDist?: boolean; count?: number }
    ): Promise<Array<[string, string?, [string, string]?]>> {
        const args: (string | number)[] = [key, lng, lat, radius, unit];

        if (options?.withCoord) args.push('WITHCOORD');
        if (options?.withDist) args.push('WITHDIST');
        if (options?.count) {
            args.push('COUNT', options.count);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.client.georadius(...args as any);
    }

    // ===========================================
    // PUB/SUB OPERATIONS
    // ===========================================

    async publish(channel: string, message: string): Promise<number> {
        return this.client.publish(channel, message);
    }

    async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        await this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, message) => {
            if (ch === channel) {
                callback(message);
            }
        });
    }

    async unsubscribe(channel: string): Promise<void> {
        await this.subscriber.unsubscribe(channel);
    }

    // ===========================================
    // RATE LIMITING
    // ===========================================

    async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
        const multi = this.client.multi();
        multi.incr(key);
        multi.expire(key, windowSeconds);
        const results = await multi.exec();

        if (!results || !results[0]) return 0;
        return results[0][1] as number;
    }

    // ===========================================
    // SESSION MANAGEMENT
    // ===========================================

    async setSession(
        sessionId: string,
        userId: string,
        data: Record<string, unknown>,
        ttlSeconds: number = 86400 // 24 hours
    ): Promise<void> {
        const key = `session:${sessionId}`;
        await this.setJSON(key, { userId, ...data }, ttlSeconds);
    }

    async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
        const key = `session:${sessionId}`;
        return this.getJSON(key);
    }

    async deleteSession(sessionId: string): Promise<void> {
        const key = `session:${sessionId}`;
        await this.del(key);
    }

    // ===========================================
    // DRIVER TRACKING
    // ===========================================

    async updateDriverLocation(
        driverId: string,
        lng: number,
        lat: number,
        serviceType: string = 'ride'
    ): Promise<void> {
        // Store in geo index for radius queries
        await this.geoadd(`drivers:location:${serviceType}`, lng, lat, driverId);

        // Store detailed location info
        await this.setJSON(`driver:${driverId}:location`, {
            lng,
            lat,
            updatedAt: new Date().toISOString(),
        }, 300); // 5 min TTL
    }

    async getNearbyDrivers(
        lng: number,
        lat: number,
        radiusKm: number,
        serviceType: string = 'ride',
        limit: number = 20
    ): Promise<Array<{ driverId: string; distance: number; lng: number; lat: number }>> {
        const results = await this.georadius(
            `drivers:location:${serviceType}`,
            lng,
            lat,
            radiusKm,
            'km',
            { withCoord: true, withDist: true, count: limit }
        );

        return results.map(result => ({
            driverId: result[0],
            distance: parseFloat(result[1] || '0'),
            lng: parseFloat(result[2]?.[0] || '0'),
            lat: parseFloat(result[2]?.[1] || '0'),
        }));
    }

    async removeDriverFromTracking(driverId: string, serviceType: string = 'ride'): Promise<void> {
        await this.zrem(`drivers:location:${serviceType}`, driverId);
        await this.del(`driver:${driverId}:location`);
    }

    // Getter for the Redis client
    getClient(): Redis {
        return this.client;
    }
}
