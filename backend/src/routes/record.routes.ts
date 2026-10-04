import { Router } from 'express';
import { recordController } from '../controllers/record.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { CreateRecordDto } from '../dto/create-record.dto';
import { UpdateRecordDto } from '../dto/update-record.dto';

const router = Router();

// All record endpoints require JWT authentication
router.use(authenticateJwt);

router.get('/', recordController.getAll);
router.post('/', validateDto(CreateRecordDto), recordController.create);
router.get('/:id', recordController.getOne);
router.put('/:id', validateDto(UpdateRecordDto), recordController.update);
router.delete('/:id', recordController.delete);

export default router;
