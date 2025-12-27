import { Response } from 'express';
import {
    AuthenticatedRequest,
    asyncHandler
} from '../../shared/src/middleware';
import { PaymentService } from '../services/payment.service';
import {
    topUpWalletSchema
} from '../../shared/src/types/schemas';

export class PaymentController {

    static getBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const data = await PaymentService.getWalletBalance(req.userId!);
        res.status(200).json({ success: true, data });
    });

    static topUp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { amount, paymentMethodId } = topUpWalletSchema.parse(req.body);
        const data = await PaymentService.topUpWallet(req.userId!, amount, paymentMethodId);

        res.status(200).json({
            success: true,
            message: 'Wallet topped up successfully',
            data
        });
    });
}
