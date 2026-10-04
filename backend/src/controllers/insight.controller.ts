import { Request, Response, NextFunction } from 'express';
import { insightService, InsightService } from '../services/insight.service';

export class InsightController {
  constructor(private readonly service: InsightService = insightService) {}

  getInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { days, metricId } = req.query;

      const parsedDays = days !== undefined ? parseInt(days as string, 10) : undefined;

      const data = await this.service.getInsights(req.user!.id, {
        days: parsedDays,
        metricId: metricId as string | undefined,
      });

      res.status(200).json({
        statusCode: 200,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const insightController = new InsightController();
