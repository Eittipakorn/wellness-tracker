import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

// Dashboard requires JWT authentication
router.use(authenticateJwt);

router.get('/', dashboardController.getDashboard);

export default router;
