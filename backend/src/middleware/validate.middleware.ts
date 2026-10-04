import { Request, Response, NextFunction } from 'express';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

export function validateDto<T extends object>(dtoClass: ClassConstructor<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dtoInstance = plainToInstance(dtoClass, req.body);
    const errors: ValidationError[] = await validate(dtoInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        error.constraints ? Object.values(error.constraints) : []
      );

      res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: messages.length === 1 ? messages[0] : messages,
        details: errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        })),
      });
      return;
    }

    req.body = dtoInstance;
    next();
  };
}
