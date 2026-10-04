import { Request, Response, NextFunction } from 'express';
import { dashboardService, DashboardService } from '../services/dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService = dashboardService) {}

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { days, startDate, endDate } = req.query;

      const parsedDays = days !== undefined ? parseInt(days as string, 10) : undefined;

      const data = await this.service.getDashboardData(req.user!.id, {
        days: parsedDays,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
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

export const dashboardController = new DashboardController();
