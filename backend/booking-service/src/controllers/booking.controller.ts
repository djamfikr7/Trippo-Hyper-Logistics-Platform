import { Response } from 'express';
import {
    AuthenticatedRequest,
    asyncHandler
} from '../../shared/src/middleware';
import { BookingService } from '../services/booking.service';
import {
    createRideRequestSchema,
    createFoodOrderSchema,
    createFreightRequestSchema,
    createMoneyDeliverySchema,
    cancelRequestSchema
} from '../../shared/src/types/schemas';

export class BookingController {

    static createRide = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = createRideRequestSchema.parse(req.body);
        const booking = await BookingService.createRideRequest(req.userId!, validatedData);
        res.status(201).json({ success: true, message: 'Ride request created', data: { booking } });
    });

    static createFoodOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = createFoodOrderSchema.parse(req.body);
        const result = await BookingService.createFoodOrder(req.userId!, validatedData);
        res.status(201).json({ success: true, message: 'Food order created', data: result });
    });

    static createMoneyDelivery = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = createMoneyDeliverySchema.parse(req.body);
        const result = await BookingService.createMoneyDelivery(req.userId!, validatedData);
        res.status(201).json({ success: true, message: 'Money delivery request created', data: result });
    });

    static createFreight = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = createFreightRequestSchema.parse(req.body);
        const result = await BookingService.createFreightRequest(req.userId!, validatedData);
        res.status(201).json({ success: true, message: 'Freight request created', data: result });
    });

    static createEmergency = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { type, location } = req.body; // 'rescue' or 'fix'
        const result = await BookingService.createEmergencyRequest(req.userId!, type, location);
        res.status(201).json({ success: true, message: 'Emergency request created', data: result });
    });

    static getBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const booking = await BookingService.getBookingDetails(id);
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
        res.status(200).json({ success: true, data: { booking } });
    });

    static cancelBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const { reason } = cancelRequestSchema.parse(req.body);
        const result = await BookingService.cancelBooking(id, req.userId!, reason);
        res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: result });
    });
}
