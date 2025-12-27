import { Pool, PoolClient, QueryResult } from 'pg';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

// ===========================================
// DATABASE SERVICE
// ===========================================

class DatabaseServiceClass {
    private pool: Pool | null = null;

    async initialize(): Promise<void> {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            logger.error('Unexpected database error', { error: err.message });
        });

        // Test connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        logger.info('Database pool initialized');
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            logger.info('Database pool closed');
        }
    }

    async query<T>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
        if (!this.pool) throw new Error('Database not initialized');

        const start = Date.now();
        const result = await this.pool.query<T>(text, params);
        const duration = Date.now() - start;

        logger.debug('Executed query', {
            text: text.substring(0, 100),
            duration: `${duration}ms`,
            rows: result.rowCount
        });

        return result;
    }

    async getClient(): Promise<PoolClient> {
        if (!this.pool) throw new Error('Database not initialized');
        return this.pool.connect();
    }

    // Transaction helper
    async transaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {
        const client = await this.getClient();

        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export const DatabaseService = new DatabaseServiceClass();
