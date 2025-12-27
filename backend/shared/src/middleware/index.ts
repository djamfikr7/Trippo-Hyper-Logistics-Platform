import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { verifyToken, TokenPayload } from '../utils/crypto';
import { logger } from '../utils/logger';

// ===========================================
// CUSTOM ERROR CLASSES
// ===========================================

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(400, message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(401, message, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'You do not have permission to perform this action') {
        super(403, message, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(404, `${resource} not found`, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests, please try again later') {
        super(429, message, 'RATE_LIMIT');
        this.name = 'RateLimitError';
    }
}

// ===========================================
// REQUEST EXTENSION
// ===========================================

export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
    userId?: string;
}

// ===========================================
// AUTHENTICATION MIDDLEWARE
// ===========================================

export function authMiddleware(jwtSecret: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AuthenticationError('No token provided');
            }

            const token = authHeader.substring(7);
            const payload = verifyToken(token, jwtSecret);

            if (payload.type !== 'access') {
                throw new AuthenticationError('Invalid token type');
            }

            req.user = payload;
            req.userId = payload.userId;
            next();
        } catch (error) {
            if (error instanceof AppError) {
                next(error);
            } else {
                next(new AuthenticationError('Invalid or expired token'));
            }
        }
    };
}

// ===========================================
// ROLE-BASED ACCESS CONTROL
// ===========================================

export function requireRoles(...allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AuthenticationError());
        }

        const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            return next(new AuthorizationError());
        }

        next();
    };
}

// ===========================================
// VALIDATION MIDDLEWARE
// ===========================================

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = source === 'body' ? req.body :
                source === 'query' ? req.query : req.params;

            const result = schema.parse(data);

            if (source === 'body') {
                req.body = result;
            } else if (source === 'query') {
                (req as Request).query = result;
            } else {
                req.params = result;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                next(new ValidationError('Validation failed', formattedErrors));
            } else {
                next(error);
            }
        }
    };
}

// ===========================================
// ERROR HANDLER MIDDLEWARE
// ===========================================

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
) {
    // Log the error
    logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Handle known errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
    }

    // Handle unknown errors
    const statusCode = 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message,
        },
    });
}

// ===========================================
// REQUEST LOGGING MIDDLEWARE
// ===========================================

export function requestLogger(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.userId,
            ip: req.ip,
        });
    });

    next();
}

// ===========================================
// RATE LIMITING HELPERS
// ===========================================

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
}

export function getRateLimitKey(
    req: Request,
    prefix: string = 'rl'
): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${prefix}:${ip}`;
}

// ===========================================
// ASYNC HANDLER
// ===========================================

type AsyncHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
