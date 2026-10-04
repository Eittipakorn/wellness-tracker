import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.register(req.body);
      res.status(201).json({
        statusCode: 201,
        message: 'User registered successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      res.status(200).json({
        statusCode: 200,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        statusCode: 200,
        data: { user: req.user },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
