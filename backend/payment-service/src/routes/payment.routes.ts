import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../../shared/src/middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.use(authMiddleware(JWT_SECRET));

router.get('/balance', PaymentController.getBalance);
router.post('/top-up', PaymentController.topUp);

export { router as paymentRoutes };
