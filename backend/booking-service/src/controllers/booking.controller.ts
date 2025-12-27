import { Response } from 'express';
import {
    AuthenticatedRequest,
    asyncHandler
} from '../../shared/src/middleware';
import { BookingService } from '../services/booking.service';
import {
    createRideRequestSchema,
    cancelRequestSchema
} from '../../shared/src/types/schemas';

export class BookingController {

    static createRide = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const validatedData = createRideRequestSchema.parse(req.body);
        const booking = await BookingService.createRideRequest(req.userId!, validatedData);

        res.status(201).json({
            success: true,
            message: 'Booking request created and searching for drivers',
            data: { booking }
        });
    });

    static getBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const booking = await BookingService.getBookingDetails(id);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        res.status(200).json({
            success: true,
            data: { booking }
        });
    });

    static cancelBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const { reason } = cancelRequestSchema.parse(req.body);

        const result = await BookingService.cancelBooking(id, req.userId!, reason);

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: result
        });
    });
}
