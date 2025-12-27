import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authMiddleware } from '../../shared/src/middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.use(authMiddleware(JWT_SECRET));

router.post('/ride', BookingController.createRide);
router.post('/food', BookingController.createFoodOrder);
router.post('/money', BookingController.createMoneyDelivery);
router.post('/freight', BookingController.createFreight);
router.post('/emergency', BookingController.createEmergency);
router.get('/:id', BookingController.getBooking);
router.post('/:id/cancel', BookingController.cancelBooking);

export { router as bookingRoutes };
