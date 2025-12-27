import { DatabaseService } from './database.service';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16',
});

export class PaymentService {

    static async getWalletBalance(userId: string) {
        const result = await DatabaseService.query(
            'SELECT wallet_balance, currency FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }

    static async topUpWallet(userId: string, amount: number, paymentMethodId: string) {
        // 1. Create a PaymentIntent with Stripe
        // For local dev, we might simulate this
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // convert to cents
            currency: 'usd',
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        });

        if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment failed');
        }

        // 2. Update wallet in database via transaction
        return await DatabaseService.transaction(async (client) => {
            // Update balance
            const updateResult = await client.query(
                'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
                [amount, userId]
            );

            // Log transaction
            await client.query(
                `INSERT INTO wallet_transactions (
          user_id, transaction_type, amount, status, external_transaction_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, 'credit', amount, 'completed', paymentIntent.id, 'Wallet top-up via Stripe']
            );

            return updateResult.rows[0];
        });
    }

    static async processPayment(userId: string, amount: number, requestId: string, method: string) {
        // Logic for processing payment for a ride/order
        // If wallet, check balance first
        if (method === 'wallet') {
            return await DatabaseService.transaction(async (client) => {
                const user = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);

                if (user.rows[0].wallet_balance < amount) {
                    throw new Error('Insufficient wallet balance');
                }

                await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, userId]);

                await client.query(
                    `INSERT INTO wallet_transactions (
            user_id, transaction_type, amount, status, reference_type, reference_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, 'debit', amount, 'completed', 'service_request', requestId, 'Payment for ride request']
                );

                return { success: true, method: 'wallet' };
            });
        }

        // Other methods (cash, card) handled here...
        return { success: true, method };
    }
}
