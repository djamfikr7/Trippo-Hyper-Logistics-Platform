import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }

    if (stack) {
        msg += `\n${stack}`;
    }

    return msg;
});

// Create logger factory
export function createLogger(serviceName: string) {
    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        defaultMeta: { service: serviceName },
        format: combine(
            errors({ stack: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat
        ),
        transports: [
            // Console transport
            new winston.transports.Console({
                format: combine(
                    colorize(),
                    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                    logFormat
                ),
            }),
        ],
    });

    // Add file transports in production
    if (process.env.NODE_ENV === 'production') {
        logger.add(new winston.transports.File({
            filename: `logs/${serviceName}-error.log`,
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }));
        logger.add(new winston.transports.File({
            filename: `logs/${serviceName}-combined.log`,
            maxsize: 5242880,
            maxFiles: 5,
        }));
    }

    return logger;
}

// Default logger
export const logger = createLogger('trippo');

// Request logging helper
export function logRequest(req: { method: string; path: string; ip?: string }, userId?: string) {
    logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId,
    });
}

// Error logging helper
export function logError(error: Error, context?: Record<string, unknown>) {
    logger.error(error.message, {
        stack: error.stack,
        ...context,
    });
}
