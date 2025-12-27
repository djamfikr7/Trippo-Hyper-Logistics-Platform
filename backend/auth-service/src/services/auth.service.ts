import {
    DatabaseService
} from './database.service';
import {
    RedisService
} from './redis.service';
import {
    hashPassword,
    comparePassword,
    generateTokens,
    generateOTP,
    generateReferralCode
} from '../../shared/src/utils/crypto';
import {
    AuthenticationError,
    ConflictError,
    NotFoundError,
    ValidationError
} from '../../shared/src/middleware';
import {
    LoginInput,
    RegisterInput
} from '../../shared/src/types/schemas';
import { logger } from '../../shared/src/utils/logger';

export class AuthService {
    private static readonly JWT_SECRET = process.env.JWT_SECRET || 'secret';

    static async register(input: RegisterInput) {
        // 1. Check if user exists
        const existingUser = await DatabaseService.query(
            'SELECT id FROM users WHERE email = $1 OR phone = $2',
            [input.email, input.phone]
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
            throw new ConflictError('User with this email or phone already exists');
        }

        // 2. Hash password
        const passwordHash = await hashPassword(input.password);

        // 3. Create user in transaction
        return await DatabaseService.transaction(async (client) => {
            // Create user
            const userResult = await client.query(
                `INSERT INTO users (
          email, phone, password_hash, first_name, last_name, language_code
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, phone, first_name, last_name`,
                [input.email, input.phone, passwordHash, input.firstName, input.lastName, input.languageCode]
            );

            const user = userResult.rows[0];

            // Assign 'rider' role by default
            await client.query(
                `INSERT INTO user_roles (user_id, role_id) 
         SELECT $1, id FROM roles WHERE name = 'rider'`,
                [user.id]
            );

            // Create loyalty program entry
            await client.query(
                'INSERT INTO loyalty_program (user_id) VALUES ($1)',
                [user.id]
            );

            // 4. Generate OTP for verification
            const otp = generateOTP();
            await RedisService.setOTP(user.phone, otp, 'phone');

            logger.info('User registered, OTP generated', { userId: user.id, phone: user.phone, otp });
            // In production, send SMS here via notification-service

            return user;
        });
    }

    static async login(input: LoginInput) {
        const identifier = input.email || input.phone;

        // 1. Find user
        const userResult = await DatabaseService.query(
            `SELECT u.id, u.email, u.phone, u.password_hash, array_agg(r.name) as roles
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.email = $1 OR u.phone = $1
       GROUP BY u.id`,
            [identifier]
        );

        if (!userResult.rowCount || userResult.rowCount === 0) {
            throw new AuthenticationError('Invalid credentials');
        }

        const user = userResult.rows[0];

        // 2. Check password
        const isValid = await comparePassword(input.password, user.password_hash);
        if (!isValid) {
            await RedisService.incrementFailedAttempts(identifier!);
            throw new AuthenticationError('Invalid credentials');
        }

        // 3. Reset failed attempts
        await RedisService.clearFailedAttempts(identifier!);

        // 4. Generate tokens
        const tokens = generateTokens(
            {
                userId: user.id,
                email: user.email,
                roles: user.roles,
            },
            this.JWT_SECRET
        );

        // 5. Store session in Redis
        await RedisService.setSession(user.id, user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                roles: user.roles,
            },
            ...tokens,
        };
    }

    static async verifyOTP(identifier: string, otp: string, type: 'phone' | 'email') {
        const storedOTP = await RedisService.getOTP(identifier, type);

        if (!storedOTP || storedOTP !== otp) {
            throw new ValidationError('Invalid or expired OTP');
        }

        await RedisService.deleteOTP(identifier, type);

        // Update user verification status
        await DatabaseService.query(
            `UPDATE users SET ${type}_verified = TRUE, verification_level = 'basic' 
       WHERE ${type} = $1`,
            [identifier]
        );

        return { success: true, message: `${type} verified successfully` };
    }

    static async refreshToken(refreshToken: string) {
        // Logic for refreshing tokens
        // ...
    }

    static async logout(userId: string) {
        await RedisService.deleteSession(userId);
        return { success: true };
    }
}
