import { Router } from 'express';

const router = Router();

router.get('/stats', (req, res) => {
    res.json({ message: 'Loyalty stats placeholder' });
});

export { router as loyaltyRoutes };
