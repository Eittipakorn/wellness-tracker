import { Router } from 'express';
import { insightController } from '../controllers/insight.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

// Insights require JWT authentication
router.use(authenticateJwt);

router.get('/', insightController.getInsights);

export default router;
