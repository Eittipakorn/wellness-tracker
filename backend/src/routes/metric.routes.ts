import { Router } from 'express';
import { metricController } from '../controllers/metric.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { CreateMetricDto } from '../dto/create-metric.dto';
import { UpdateMetricDto } from '../dto/update-metric.dto';

const router = Router();

// All metric endpoints require JWT authentication
router.use(authenticateJwt);

router.get('/', metricController.getAll);
router.post('/', validateDto(CreateMetricDto), metricController.create);
router.get('/:id', metricController.getOne);
router.put('/:id', validateDto(UpdateMetricDto), metricController.update);
router.delete('/:id', metricController.delete);

export default router;
