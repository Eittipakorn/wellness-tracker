import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateDto } from '../middleware/validate.middleware';
import { authenticateJwt } from '../middleware/auth.middleware';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

const router = Router();

router.post('/register', validateDto(RegisterDto), authController.register);
router.post('/login', validateDto(LoginDto), authController.login);
router.get('/me', authenticateJwt, authController.getMe);

export default router;
