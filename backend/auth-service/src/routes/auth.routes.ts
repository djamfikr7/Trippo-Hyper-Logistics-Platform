import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../../shared/src/middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-otp', AuthController.verifyOTP);

// Protected routes
router.use(authMiddleware(JWT_SECRET));
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getMe);

export { router as authRoutes };
