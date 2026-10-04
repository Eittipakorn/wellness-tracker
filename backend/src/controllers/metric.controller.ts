import { Request, Response, NextFunction } from 'express';
import { isUUID } from 'class-validator';
import { metricService, MetricService } from '../services/metric.service';
import { BadRequestError } from '../lib/errors';

export class MetricController {
  constructor(private readonly service: MetricService = metricService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.service.getUserMetrics(req.user!.id);
      res.status(200).json({
        statusCode: 200,
        data: { metrics },
      });
    } catch (error) {
      next(error);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) {
        throw new BadRequestError('Invalid metric ID format. Expected a valid UUID.');
      }

      const metric = await this.service.getMetricById(id, req.user!.id);
      res.status(200).json({
        statusCode: 200,
        data: { metric },
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metric = await this.service.createMetric(req.user!.id, req.body);
      res.status(201).json({
        statusCode: 201,
        message: 'Metric created successfully',
        data: { metric },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) {
        throw new BadRequestError('Invalid metric ID format. Expected a valid UUID.');
      }

      const metric = await this.service.updateMetric(id, req.user!.id, req.body);
      res.status(200).json({
        statusCode: 200,
        message: 'Metric updated successfully',
        data: { metric },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) {
        throw new BadRequestError('Invalid metric ID format. Expected a valid UUID.');
      }

      await this.service.deleteMetric(id, req.user!.id);
      res.status(200).json({
        statusCode: 200,
        message: 'Metric deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const metricController = new MetricController();
