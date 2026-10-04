import { MetricType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { BadRequestError } from '../lib/errors';

export interface DashboardOptions {
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface MetricSummaryItem {
  id: string;
  name: string;
  type: MetricType;
  unit: string | null;
  description: string | null;
  isActive: boolean;
  group: { id: string; name: string } | null;
  summary: {
    totalRecords: number;
    latestValue: any;
    latestRecordedAt: Date | null;
    average?: number | null;
    min?: number | null;
    max?: number | null;
    trueCount?: number;
    falseCount?: number;
    optionBreakdown?: Record<string, number>;
  };
  trend: any[];
}

export interface DashboardResponseData {
  overview: {
    totalMetrics: number;
    activeMetrics: number;
    totalRecordsInRange: number;
    dateRange: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  metrics: MetricSummaryItem[];
  recentRecords: {
    id: string;
    metricId: string;
    metricName: string;
    metricType: MetricType;
    metricUnit: string | null;
    value: Prisma.JsonValue;
    note: string | null;
    recordedAt: Date;
    createdAt: Date;
  }[];
}

export class DashboardService {
  async getDashboardData(userId: string, options: DashboardOptions = {}): Promise<DashboardResponseData> {
    const { startDate, endDate, days } = this.resolveDateRange(options);

    // 1. Fetch user's metrics
    const metrics = await prisma.metric.findMany({
      where: { accountId: userId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch user's records within the date range
    const recordsInRange = await prisma.metricRecord.findMany({
      where: {
        metric: { accountId: userId },
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ recordedAt: 'asc' }, { createdAt: 'asc' }],
    });

    // 3. Fetch recent records (last 10 across all metrics)
    const recentRecordsRaw = await prisma.metricRecord.findMany({
      where: {
        metric: { accountId: userId },
      },
      include: {
        metric: {
          select: {
            name: true,
            type: true,
            unit: true,
          },
        },
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });

    const recentRecords = recentRecordsRaw.map((r) => ({
      id: r.id,
      metricId: r.metricId,
      metricName: r.metric.name,
      metricType: r.metric.type,
      metricUnit: r.metric.unit,
      value: r.value,
      note: r.note,
      recordedAt: r.recordedAt,
      createdAt: r.createdAt,
    }));

    // 4. Summarize each metric
    const metricSummaries: MetricSummaryItem[] = metrics.map((metric) => {
      const metricRecords = recordsInRange.filter((r) => r.metricId === metric.id);
      return this.computeMetricSummary(metric, metricRecords);
    });

    return {
      overview: {
        totalMetrics: metrics.length,
        activeMetrics: metrics.filter((m) => m.isActive).length,
        totalRecordsInRange: recordsInRange.length,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      },
      metrics: metricSummaries,
      recentRecords,
    };
  }

  private resolveDateRange(options: DashboardOptions): { startDate: Date; endDate: Date; days: number } {
    let startDate: Date;
    let endDate: Date;
    let days: number;

    if (options.startDate || options.endDate) {
      if (!options.startDate || !options.endDate) {
        throw new BadRequestError('Both startDate and endDate must be provided when filtering by date range');
      }

      startDate = new Date(options.startDate);
      endDate = new Date(options.endDate);

      if (isNaN(startDate.getTime())) {
        throw new BadRequestError('Invalid startDate format');
      }
      if (isNaN(endDate.getTime())) {
        throw new BadRequestError('Invalid endDate format');
      }
      if (startDate > endDate) {
        throw new BadRequestError('startDate cannot be after endDate');
      }

      // If endDate has no time part (e.g., 2026-10-04), extend to end of day
      if (options.endDate.length === 10) {
        endDate.setUTCHours(23, 59, 59, 999);
      }

      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      const parsedDays = options.days !== undefined ? Number(options.days) : 7;
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365 || !Number.isInteger(parsedDays)) {
        throw new BadRequestError('days must be an integer between 1 and 365');
      }

      days = parsedDays;
      endDate = new Date();
      startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    return { startDate, endDate, days };
  }

  private computeMetricSummary(
    metric: {
      id: string;
      name: string;
      type: MetricType;
      unit: string | null;
      description: string | null;
      isActive: boolean;
      group: { id: string; name: string } | null;
      options: { id: string; label: string }[];
      ratingMin?: number | null;
      ratingMax?: number | null;
    },
    records: { id: string; value: Prisma.JsonValue; recordedAt: Date }[]
  ): MetricSummaryItem {
    const totalRecords = records.length;

    if (totalRecords === 0) {
      return {
        id: metric.id,
        name: metric.name,
        type: metric.type,
        unit: metric.unit,
        description: metric.description,
        isActive: metric.isActive,
        group: metric.group,
        summary: {
          totalRecords: 0,
          latestValue: null,
          latestRecordedAt: null,
          ...(metric.type === MetricType.NUMBER || metric.type === MetricType.RATING
            ? { average: null, min: null, max: null }
            : {}),
          ...(metric.type === MetricType.BOOLEAN
            ? { trueCount: 0, falseCount: 0 }
            : {}),
          ...(metric.type === MetricType.SINGLE_SELECT || metric.type === MetricType.MULTIPLE_SELECT
            ? { optionBreakdown: {} }
            : {}),
        },
        trend: [],
      };
    }

    const latestRecord = records[records.length - 1];

    switch (metric.type) {
      case MetricType.NUMBER: {
        const numValues = records
          .map((r) => this.extractNumeric(r.value))
          .filter((v): v is number => v !== null);

        const sum = numValues.reduce((acc, val) => acc + val, 0);
        const average = numValues.length > 0 ? Math.round((sum / numValues.length) * 100) / 100 : null;
        const min = numValues.length > 0 ? Math.min(...numValues) : null;
        const max = numValues.length > 0 ? Math.max(...numValues) : null;

        // Daily trend
        const dailyMap = new Map<string, number[]>();
        for (const r of records) {
          const day = r.recordedAt.toISOString().slice(0, 10);
          const val = this.extractNumeric(r.value);
          if (val !== null) {
            if (!dailyMap.has(day)) dailyMap.set(day, []);
            dailyMap.get(day)!.push(val);
          }
        }

        const trend = Array.from(dailyMap.entries()).map(([date, vals]) => ({
          date,
          value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
          count: vals.length,
        }));

        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: this.extractNumeric(latestRecord.value),
            latestRecordedAt: latestRecord.recordedAt,
            average,
            min,
            max,
          },
          trend,
        };
      }

      case MetricType.RATING: {
        const ratingValues = records
          .map((r) => this.extractNumeric(r.value))
          .filter((v): v is number => v !== null);

        const sum = ratingValues.reduce((acc, val) => acc + val, 0);
        const average = ratingValues.length > 0 ? Math.round((sum / ratingValues.length) * 100) / 100 : null;
        const min = ratingValues.length > 0 ? Math.min(...ratingValues) : null;
        const max = ratingValues.length > 0 ? Math.max(...ratingValues) : null;

        const dailyMap = new Map<string, number[]>();
        for (const r of records) {
          const day = r.recordedAt.toISOString().slice(0, 10);
          const val = this.extractNumeric(r.value);
          if (val !== null) {
            if (!dailyMap.has(day)) dailyMap.set(day, []);
            dailyMap.get(day)!.push(val);
          }
        }

        const trend = Array.from(dailyMap.entries()).map(([date, vals]) => ({
          date,
          value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
          count: vals.length,
        }));

        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: this.extractNumeric(latestRecord.value),
            latestRecordedAt: latestRecord.recordedAt,
            average,
            min,
            max,
          },
          trend,
        };
      }

      case MetricType.BOOLEAN: {
        let trueCount = 0;
        let falseCount = 0;

        const dailyMap = new Map<string, { trueCount: number; falseCount: number }>();
        for (const r of records) {
          const day = r.recordedAt.toISOString().slice(0, 10);
          const bVal = this.extractBoolean(r.value);
          if (bVal === true) trueCount++;
          if (bVal === false) falseCount++;

          if (!dailyMap.has(day)) {
            dailyMap.set(day, { trueCount: 0, falseCount: 0 });
          }
          const dayEntry = dailyMap.get(day)!;
          if (bVal === true) dayEntry.trueCount++;
          if (bVal === false) dayEntry.falseCount++;
        }

        const trend = Array.from(dailyMap.entries()).map(([date, counts]) => ({
          date,
          trueCount: counts.trueCount,
          falseCount: counts.falseCount,
          totalCount: counts.trueCount + counts.falseCount,
        }));

        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: this.extractBoolean(latestRecord.value),
            latestRecordedAt: latestRecord.recordedAt,
            trueCount,
            falseCount,
          },
          trend,
        };
      }

      case MetricType.SINGLE_SELECT: {
        const optionMap = new Map(metric.options.map((o) => [o.id, o.label]));
        const optionBreakdown: Record<string, number> = {};
        for (const opt of metric.options) {
          optionBreakdown[opt.label] = 0;
        }

        const dailyMap = new Map<string, Record<string, number>>();

        for (const r of records) {
          const optId = this.extractOptionId(r.value);
          const label = optId ? optionMap.get(optId) || optId : 'Unknown';
          optionBreakdown[label] = (optionBreakdown[label] || 0) + 1;

          const day = r.recordedAt.toISOString().slice(0, 10);
          if (!dailyMap.has(day)) dailyMap.set(day, {});
          const dayCounts = dailyMap.get(day)!;
          dayCounts[label] = (dayCounts[label] || 0) + 1;
        }

        const latestOptId = this.extractOptionId(latestRecord.value);
        const latestLabel = latestOptId ? optionMap.get(latestOptId) || latestOptId : null;

        const trend = Array.from(dailyMap.entries()).map(([date, counts]) => ({
          date,
          counts,
        }));

        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: latestLabel ? { optionId: latestOptId, label: latestLabel } : latestOptId,
            latestRecordedAt: latestRecord.recordedAt,
            optionBreakdown,
          },
          trend,
        };
      }

      case MetricType.MULTIPLE_SELECT: {
        const optionMap = new Map(metric.options.map((o) => [o.id, o.label]));
        const optionBreakdown: Record<string, number> = {};
        for (const opt of metric.options) {
          optionBreakdown[opt.label] = 0;
        }

        const dailyMap = new Map<string, Record<string, number>>();

        for (const r of records) {
          const optIds = this.extractOptionIds(r.value);
          const day = r.recordedAt.toISOString().slice(0, 10);
          if (!dailyMap.has(day)) dailyMap.set(day, {});
          const dayCounts = dailyMap.get(day)!;

          for (const optId of optIds) {
            const label = optionMap.get(optId) || optId;
            optionBreakdown[label] = (optionBreakdown[label] || 0) + 1;
            dayCounts[label] = (dayCounts[label] || 0) + 1;
          }
        }

        const latestOptIds = this.extractOptionIds(latestRecord.value);
        const latestLabels = latestOptIds.map((id) => ({
          optionId: id,
          label: optionMap.get(id) || id,
        }));

        const trend = Array.from(dailyMap.entries()).map(([date, counts]) => ({
          date,
          counts,
        }));

        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: latestLabels,
            latestRecordedAt: latestRecord.recordedAt,
            optionBreakdown,
          },
          trend,
        };
      }

      case MetricType.TEXT: {
        const dailyMap = new Map<string, number>();
        for (const r of records) {
          const day = r.recordedAt.toISOString().slice(0, 10);
          dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
        }

        const trend = Array.from(dailyMap.entries()).map(([date, count]) => ({
          date,
          count,
        }));

        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: this.extractText(latestRecord.value),
            latestRecordedAt: latestRecord.recordedAt,
          },
          trend,
        };
      }

      default:
        return {
          id: metric.id,
          name: metric.name,
          type: metric.type,
          unit: metric.unit,
          description: metric.description,
          isActive: metric.isActive,
          group: metric.group,
          summary: {
            totalRecords,
            latestValue: latestRecord.value,
            latestRecordedAt: latestRecord.recordedAt,
          },
          trend: [],
        };
    }
  }

  private extractNumeric(value: Prisma.JsonValue): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null && 'value' in value) {
      const v = (value as { value: unknown }).value;
      if (typeof v === 'number') return v;
    }
    return null;
  }

  private extractBoolean(value: Prisma.JsonValue): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'object' && value !== null && 'value' in value) {
      const v = (value as { value: unknown }).value;
      if (typeof v === 'boolean') return v;
    }
    return null;
  }

  private extractOptionId(value: Prisma.JsonValue): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'optionId' in value) {
      const v = (value as { optionId: unknown }).optionId;
      if (typeof v === 'string') return v;
    }
    return null;
  }

  private extractOptionIds(value: Prisma.JsonValue): string[] {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
    if (typeof value === 'object' && value !== null && 'optionIds' in value) {
      const v = (value as { optionIds: unknown }).optionIds;
      if (Array.isArray(v)) return v.filter((item): item is string => typeof item === 'string');
    }
    return [];
  }

  private extractText(value: Prisma.JsonValue): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'value' in value) {
      const v = (value as { value: unknown }).value;
      if (typeof v === 'string') return v;
    }
    return null;
  }
}

export const dashboardService = new DashboardService();
