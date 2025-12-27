import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ===========================================
// PASSWORD UTILITIES
// ===========================================

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ===========================================
// JWT UTILITIES
// ===========================================

export interface TokenPayload {
    userId: string;
    email: string;
    roles: string[];
    type: 'access' | 'refresh';
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export function generateTokens(
    payload: Omit<TokenPayload, 'type'>,
    jwtSecret: string,
    accessExpiresIn: string = '1h',
    refreshExpiresIn: string = '7d'
): TokenPair {
    const accessToken = jwt.sign(
        { ...payload, type: 'access' },
        jwtSecret,
        { expiresIn: accessExpiresIn }
    );

    const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        jwtSecret,
        { expiresIn: refreshExpiresIn }
    );

    const decoded = jwt.decode(accessToken) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return { accessToken, refreshToken, expiresIn };
}

export function verifyToken(token: string, jwtSecret: string): TokenPayload {
    return jwt.verify(token, jwtSecret) as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch {
        return null;
    }
}

// ===========================================
// OTP UTILITIES
// ===========================================

export function generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}

export function generateSecureCode(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

// ===========================================
// UUID UTILITIES
// ===========================================

export function generateId(): string {
    return uuidv4();
}

export function isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

// ===========================================
// REFERRAL CODE UTILITIES
// ===========================================

export function generateReferralCode(prefix: string = ''): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 6;
    let code = prefix.toUpperCase().substring(0, 3);
    for (let i = 0; i < codeLength - code.length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// ===========================================
// REQUEST NUMBER UTILITIES
// ===========================================

export function generateRequestNumber(prefix: string = 'TR'): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${dateStr}-${randomPart}`;
}
