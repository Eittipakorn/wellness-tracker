import { UserResponse } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: UserResponse;
    }
  }
}
