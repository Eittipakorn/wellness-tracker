import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { JwtPayload } from '../types/auth.types';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-glance-jwt-key-change-in-production';

export async function authenticateJwt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authorization header is missing',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid authorization header format. Expected "Bearer <token>"',
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User belonging to this token no longer exists',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token has expired',
      });
      return;
    }

    res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid authentication token',
    });
    return;
  }
}
