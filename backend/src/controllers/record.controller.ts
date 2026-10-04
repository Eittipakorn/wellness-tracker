import { Request, Response, NextFunction } from 'express';
import { isUUID } from 'class-validator';
import { recordService, RecordService } from '../services/record.service';
import { BadRequestError } from '../lib/errors';

export class RecordController {
  constructor(private readonly service: RecordService = recordService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { metricId, startDate, endDate } = req.query;

      if (metricId && (typeof metricId !== 'string' || !isUUID(metricId))) {
        throw new BadRequestError('Invalid metricId format. Expected a valid UUID.');
      }

      const records = await this.service.getUserRecords(req.user!.id, {
        metricId: metricId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      });

      res.status(200).json({
        statusCode: 200,
        data: { records },
      });
    } catch (error) {
      next(error);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) {
        throw new BadRequestError('Invalid record ID format. Expected a valid UUID.');
      }

      const record = await this.service.getRecordById(id, req.user!.id);
      res.status(200).json({
        statusCode: 200,
        data: { record },
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.service.createRecord(req.user!.id, req.body);
      res.status(201).json({
        statusCode: 201,
        message: 'Record created successfully',
        data: { record },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) {
        throw new BadRequestError('Invalid record ID format. Expected a valid UUID.');
      }

      const record = await this.service.updateRecord(id, req.user!.id, req.body);
      res.status(200).json({
        statusCode: 200,
        message: 'Record updated successfully',
        data: { record },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) {
        throw new BadRequestError('Invalid record ID format. Expected a valid UUID.');
      }

      await this.service.deleteRecord(id, req.user!.id);
      res.status(200).json({
        statusCode: 200,
        message: 'Record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const recordController = new RecordController();
