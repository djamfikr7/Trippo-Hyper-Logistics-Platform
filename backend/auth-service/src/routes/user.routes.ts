import { Router } from 'express';

const router = Router();

// Placeholder for user management routes
router.get('/', (req, res) => {
    res.json({ message: 'User routes placeholder' });
});

export { router as userRoutes };
