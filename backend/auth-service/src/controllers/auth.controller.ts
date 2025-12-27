import { Response } from 'express';
import {
    AuthenticatedRequest,
    asyncHandler
} from '../../shared/src/middleware';
import { AuthService } from '../services/auth.service';
import {
    loginSchema,
    registerSchema,
    verifyOTPSchema
} from '../../shared/src/types/schemas';

export class AuthController {

    static register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = registerSchema.parse(req.body);
        const user = await AuthService.register(validatedData);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your phone.',
            data: { user }
        });
    });

    static login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = loginSchema.parse(req.body);
        const result = await AuthService.login(validatedData);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
    });

    static verifyOTP = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = verifyOTPSchema.parse(req.body);
        const identifier = validatedData.email || validatedData.phone;
        const type = validatedData.email ? 'email' : 'phone';

        const result = await AuthService.verifyOTP(identifier!, validatedData.otp, type as 'email' | 'phone');

        res.status(200).json({
            success: true,
            message: result.message
        });
    });

    static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (req.userId) {
            await AuthService.logout(req.userId);
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    });

    static getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // This would typically fetch the full profile from a UserService
        res.status(200).json({
            success: true,
            data: { user: req.user }
        });
    });
}
