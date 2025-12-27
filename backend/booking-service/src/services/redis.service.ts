import Redis from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis');

// ===========================================
// REDIS SERVICE
// ===========================================

class RedisServiceClass {
    private client: Redis | null = null;

    async connect(): Promise<void> {
        this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        });

        this.client.on('connect', () => {
            logger.info('Redis connected');
        });

        this.client.on('error', (err) => {
            logger.error('Redis error', { error: err.message });
        });
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            logger.info('Redis disconnected');
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.client) throw new Error('Redis not initialized');
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (!this.client) throw new Error('Redis not initialized');
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.client) throw new Error('Redis not initialized');
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        if (!this.client) throw new Error('Redis not initialized');
        const result = await this.client.exists(key);
        return result === 1;
    }

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

    // OTP Management
    async setOTP(identifier: string, otp: string, type: 'phone' | 'email'): Promise<void> {
        const key = `otp:${type}:${identifier}`;
        await this.set(key, otp, 300); // 5 minutes TTL
    }

    async getOTP(identifier: string, type: 'phone' | 'email'): Promise<string | null> {
        const key = `otp:${type}:${identifier}`;
        return this.get(key);
    }

    async deleteOTP(identifier: string, type: 'phone' | 'email'): Promise<void> {
        const key = `otp:${type}:${identifier}`;
        await this.del(key);
    }

    // Session Management
    async setSession(sessionId: string, userId: string, ttlSeconds: number = 604800): Promise<void> {
        const key = `session:${sessionId}`;
        await this.setJSON(key, { userId, createdAt: new Date().toISOString() }, ttlSeconds);
    }

    async getSession(sessionId: string): Promise<{ userId: string; createdAt: string } | null> {
        const key = `session:${sessionId}`;
        return this.getJSON(key);
    }

    async deleteSession(sessionId: string): Promise<void> {
        const key = `session:${sessionId}`;
        await this.del(key);
    }

    // Blacklist token (for logout)
    async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
        const key = `blacklist:${token}`;
        await this.set(key, '1', ttlSeconds);
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const key = `blacklist:${token}`;
        return this.exists(key);
    }

    // Failed login attempts tracking
    async incrementFailedAttempts(identifier: string): Promise<number> {
        if (!this.client) throw new Error('Redis not initialized');
        const key = `failed:${identifier}`;
        const count = await this.client.incr(key);
        await this.client.expire(key, 900); // 15 minutes
        return count;
    }

    async getFailedAttempts(identifier: string): Promise<number> {
        if (!this.client) throw new Error('Redis not initialized');
        const key = `failed:${identifier}`;
        const count = await this.client.get(key);
        return count ? parseInt(count, 10) : 0;
    }

    async clearFailedAttempts(identifier: string): Promise<void> {
        const key = `failed:${identifier}`;
        await this.del(key);
    }
}

export const RedisService = new RedisServiceClass();
