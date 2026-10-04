import { GoalOperator, MetricType, Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import prisma from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../lib/errors';
import {
  InsightItem,
  InsightQueryOptions,
  InsightResponseData,
} from '../types/insight.types';

export class InsightService {
  async getInsights(
    userId: string,
    options: InsightQueryOptions = {}
  ): Promise<InsightResponseData> {
    const days = this.resolveDays(options.days);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);

    // 1. Verify metricId if supplied
    if (options.metricId) {
      if (!isUUID(options.metricId)) {
        throw new BadRequestError('Invalid metricId format. Expected a valid UUID.');
      }

      const ownedMetric = await prisma.metric.findFirst({
        where: {
          id: options.metricId,
          accountId: userId,
        },
      });

      if (!ownedMetric) {
        throw new NotFoundError('Metric not found');
      }
    }

    // 2. Fetch user's metrics
    const metrics = await prisma.metric.findMany({
      where: {
        accountId: userId,
        ...(options.metricId && { id: options.metricId }),
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        goals: true,
      },
    });

    // 3. Fetch records in date range
    const records = await prisma.metricRecord.findMany({
      where: {
        metric: {
          accountId: userId,
          ...(options.metricId && { id: options.metricId }),
        },
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        metric: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
      orderBy: [{ recordedAt: 'asc' }, { createdAt: 'asc' }],
    });

    // 4. Fetch user's goals
    const goals = await prisma.goal.findMany({
      where: {
        accountId: userId,
        ...(options.metricId && { metricId: options.metricId }),
      },
      include: {
        metric: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
    });

    // 5. Generate insights deterministically
    const insights: InsightItem[] = [];

    // Cold-start condition: 0 records
    if (records.length === 0) {
      insights.push({
        id: 'insight-cold-start',
        type: 'info',
        category: 'info',
        title: 'Getting Started with Glance',
        message:
          'No entries were recorded in the selected period. Start logging your daily metrics to discover trends, patterns, and progress.',
        evidence: {
          recordCount: 0,
          periodDays: days,
        },
      });

      return {
        summary: {
          totalInsights: insights.length,
          analyzedMetrics: metrics.length,
          analyzedRecords: 0,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            days,
          },
        },
        insights,
      };
    }

    // Rule A: Goal progress & Goal-based suggestions
    this.generateGoalInsights(goals, records, insights);

    // Rule B: Trend Analysis (Requires >= 3 records)
    this.generateTrendInsights(metrics, records, insights);

    // Rule C: Pattern Analysis (Requires >= 3 records)
    this.generatePatternInsights(metrics, records, insights);

    // Rule D: Cross-Metric Association Analysis (Requires >= 3 shared days, no metricId filter restriction)
    if (!options.metricId && metrics.length >= 2) {
      this.generateRelationshipInsights(metrics, records, insights);
    }

    // Insufficient evidence condition
    if (insights.length === 0) {
      insights.push({
        id: 'insight-insufficient-data',
        type: 'info',
        category: 'info',
        title: 'Building Your Data Profile',
        message: `You have logged ${records.length} entries so far. Continue tracking over the coming days to unlock trends, patterns, and associations.`,
        evidence: {
          currentRecords: records.length,
          minimumRecordsRequired: 3,
        },
      });
    }

    return {
      summary: {
        totalInsights: insights.length,
        analyzedMetrics: metrics.length,
        analyzedRecords: records.length,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      },
      insights,
    };
  }

  private resolveDays(daysParam?: number): number {
    if (daysParam === undefined) return 7;

    const parsed = Number(daysParam);
    if (isNaN(parsed) || parsed < 1 || parsed > 365 || !Number.isInteger(parsed)) {
      throw new BadRequestError('days must be an integer between 1 and 365');
    }

    return parsed;
  }

  private generateGoalInsights(
    goals: {
      id: string;
      name: string;
      metricId: string;
      targetValue: Prisma.JsonValue;
      operator: GoalOperator;
      metric: { id: string; name: string; type: MetricType; unit: string | null };
    }[],
    records: { metricId: string; value: Prisma.JsonValue; recordedAt: Date }[],
    insights: InsightItem[]
  ): void {
    for (const goal of goals) {
      const metricRecords = records.filter((r) => r.metricId === goal.metricId);
      const targetVal = this.extractNumeric(goal.targetValue);

      if (targetVal === null) continue;

      if (metricRecords.length === 0) {
        continue;
      }

      // Group records by calendar date
      const dayValuesMap = new Map<string, number[]>();
      for (const r of metricRecords) {
        const day = r.recordedAt.toISOString().slice(0, 10);
        const val = this.extractNumeric(r.value);
        if (val !== null) {
          if (!dayValuesMap.has(day)) dayValuesMap.set(day, []);
          dayValuesMap.get(day)!.push(val);
        }
      }

      if (dayValuesMap.size === 0) continue;

      let daysMet = 0;
      const allValues: number[] = [];

      for (const vals of dayValuesMap.values()) {
        const dayAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
        allValues.push(dayAvg);
        if (this.checkGoalCondition(dayAvg, targetVal, goal.operator)) {
          daysMet++;
        }
      }

      const totalRecordedDays = dayValuesMap.size;
      const currentAvg = Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 100) / 100;
      const achievementRate = Math.round((daysMet / totalRecordedDays) * 100);

      insights.push({
        id: `goal-progress-${goal.id}`,
        type: 'goal_progress',
        category: achievementRate >= 70 ? 'positive' : 'info',
        title: `Goal Progress: ${goal.name}`,
        message:
          daysMet === totalRecordedDays
            ? `You met your ${goal.name} target on all ${daysMet} days logged during this period.`
            : `You met your ${goal.name} target on ${daysMet} of ${totalRecordedDays} recorded days (${achievementRate}%).`,
        metricId: goal.metric.id,
        metricName: goal.metric.name,
        evidence: {
          target: targetVal,
          operator: goal.operator,
          daysMet,
          totalRecordedDays,
          achievementRate,
          currentAverage: currentAvg,
        },
      });

      // Suggestion if target is not consistently met
      if (achievementRate < 100) {
        insights.push({
          id: `goal-suggestion-${goal.id}`,
          type: 'suggestion',
          category: 'info',
          title: `Goal Focus: ${goal.metric.name}`,
          message: `Your current average for ${goal.metric.name} is ${currentAvg}${goal.metric.unit ? ' ' + goal.metric.unit : ''} (goal: ${this.formatOperator(goal.operator)} ${targetVal}${goal.metric.unit ? ' ' + goal.metric.unit : ''}). Aiming for consistent daily entries will help reach your target.`,
          metricId: goal.metric.id,
          metricName: goal.metric.name,
          evidence: {
            currentAverage: currentAvg,
            target: targetVal,
            operator: goal.operator,
          },
        });
      }
    }
  }

  private generateTrendInsights(
    metrics: {
      id: string;
      name: string;
      type: MetricType;
      unit: string | null;
    }[],
    records: { metricId: string; value: Prisma.JsonValue; recordedAt: Date }[],
    insights: InsightItem[]
  ): void {
    for (const metric of metrics) {
      if (metric.type !== MetricType.NUMBER && metric.type !== MetricType.RATING) continue;

      const metricRecords = records.filter((r) => r.metricId === metric.id);

      // Minimum evidence requirement: at least 3 records
      if (metricRecords.length < 3) continue;

      const numValues = metricRecords
        .map((r) => this.extractNumeric(r.value))
        .filter((v): v is number => v !== null);

      if (numValues.length < 3) continue;

      const mid = Math.floor(numValues.length / 2);
      const firstHalf = numValues.slice(0, mid);
      const secondHalf = numValues.slice(mid);

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = avgSecond - avgFirst;

      const unitStr = metric.unit ? ` ${metric.unit}` : '';
      const roundedFirst = Math.round(avgFirst * 10) / 10;
      const roundedSecond = Math.round(avgSecond * 10) / 10;

      // Threshold: change >= 0.3 for ratings or >= 3% relative change
      const isSignificantChange =
        metric.type === MetricType.RATING
          ? Math.abs(diff) >= 0.3
          : Math.abs(diff) >= Math.max(0.2, Math.abs(avgFirst) * 0.03);

      if (isSignificantChange) {
        if (diff > 0) {
          insights.push({
            id: `trend-up-${metric.id}`,
            type: 'trend',
            category: 'info',
            title: `${metric.name} Upward Trend`,
            message: `Your ${metric.name} trended upward over this period, shifting from an average of ${roundedFirst}${unitStr} to ${roundedSecond}${unitStr}.`,
            metricId: metric.id,
            metricName: metric.name,
            evidence: {
              firstHalfAverage: roundedFirst,
              secondHalfAverage: roundedSecond,
              difference: Math.round(diff * 10) / 10,
              recordCount: numValues.length,
            },
          });
        } else {
          insights.push({
            id: `trend-down-${metric.id}`,
            type: 'trend',
            category: 'info',
            title: `${metric.name} Downward Trend`,
            message: `Your ${metric.name} trended downward over this period, shifting from an average of ${roundedFirst}${unitStr} to ${roundedSecond}${unitStr}.`,
            metricId: metric.id,
            metricName: metric.name,
            evidence: {
              firstHalfAverage: roundedFirst,
              secondHalfAverage: roundedSecond,
              difference: Math.round(diff * 10) / 10,
              recordCount: numValues.length,
            },
          });
        }
      } else {
        insights.push({
          id: `trend-stable-${metric.id}`,
          type: 'trend',
          category: 'info',
          title: `Stable ${metric.name}`,
          message: `Your recorded ${metric.name} remained relatively steady across ${numValues.length} entries, averaging ${roundedSecond}${unitStr}.`,
          metricId: metric.id,
          metricName: metric.name,
          evidence: {
            average: roundedSecond,
            recordCount: numValues.length,
          },
        });
      }
    }
  }

  private generatePatternInsights(
    metrics: {
      id: string;
      name: string;
      type: MetricType;
      options: { id: string; label: string }[];
    }[],
    records: { metricId: string; value: Prisma.JsonValue; recordedAt: Date }[],
    insights: InsightItem[]
  ): void {
    for (const metric of metrics) {
      const metricRecords = records.filter((r) => r.metricId === metric.id);

      // Minimum evidence requirement: at least 3 records
      if (metricRecords.length < 3) continue;

      if (metric.type === MetricType.BOOLEAN) {
        const uniqueDaysCompleted = new Set<string>();
        const uniqueDaysLogged = new Set<string>();

        for (const r of metricRecords) {
          const day = r.recordedAt.toISOString().slice(0, 10);
          uniqueDaysLogged.add(day);
          if (this.extractBoolean(r.value) === true) {
            uniqueDaysCompleted.add(day);
          }
        }

        const completedDays = uniqueDaysCompleted.size;
        const totalDays = uniqueDaysLogged.size;

        if (completedDays >= 3) {
          insights.push({
            id: `pattern-consistency-${metric.id}`,
            type: 'pattern',
            category: 'positive',
            title: `Consistent ${metric.name}`,
            message: `"${metric.name}" was recorded as completed on ${completedDays} of ${totalDays} logged days. Consistent tracking supports habit awareness.`,
            metricId: metric.id,
            metricName: metric.name,
            evidence: {
              completedDays,
              totalDaysLogged: totalDays,
            },
          });
        }
      } else if (metric.type === MetricType.SINGLE_SELECT && metric.options.length > 0) {
        const optionMap = new Map(metric.options.map((o) => [o.id, o.label]));
        const counts: Record<string, number> = {};

        for (const r of metricRecords) {
          const optId = this.extractOptionId(r.value);
          if (optId) {
            const label = optionMap.get(optId) || optId;
            counts[label] = (counts[label] || 0) + 1;
          }
        }

        // Find most frequent option
        let maxLabel = '';
        let maxCount = 0;
        for (const [label, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }

        // Highlight if dominant (>= 50% of entries)
        if (maxCount >= 3 && maxCount / metricRecords.length >= 0.5) {
          const pct = Math.round((maxCount / metricRecords.length) * 100);
          insights.push({
            id: `pattern-selection-${metric.id}`,
            type: 'pattern',
            category: 'info',
            title: `Frequent Selection: ${metric.name}`,
            message: `"${maxLabel}" was the most frequent entry for ${metric.name}, recorded in ${maxCount} of ${metricRecords.length} entries (${pct}%).`,
            metricId: metric.id,
            metricName: metric.name,
            evidence: {
              frequentOption: maxLabel,
              count: maxCount,
              totalRecords: metricRecords.length,
              percentage: pct,
            },
          });
        }
      }
    }
  }

  private generateRelationshipInsights(
    metrics: {
      id: string;
      name: string;
      type: MetricType;
    }[],
    records: { metricId: string; value: Prisma.JsonValue; recordedAt: Date }[],
    insights: InsightItem[]
  ): void {
    const booleanMetrics = metrics.filter((m) => m.type === MetricType.BOOLEAN);
    const numericMetrics = metrics.filter(
      (m) => m.type === MetricType.NUMBER || m.type === MetricType.RATING
    );

    if (booleanMetrics.length === 0 || numericMetrics.length === 0) return;

    // Group records by calendar day (YYYY-MM-DD)
    const dayMap = new Map<string, Map<string, Prisma.JsonValue[]>>();
    for (const r of records) {
      const day = r.recordedAt.toISOString().slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, new Map());
      const dayMetrics = dayMap.get(day)!;
      if (!dayMetrics.has(r.metricId)) dayMetrics.set(r.metricId, []);
      dayMetrics.get(r.metricId)!.push(r.value);
    }

    for (const boolM of booleanMetrics) {
      for (const numM of numericMetrics) {
        // Collect days where both metrics were logged
        const trueDaysValues: number[] = [];
        const falseDaysValues: number[] = [];

        for (const dayMetrics of dayMap.values()) {
          if (dayMetrics.has(boolM.id) && dayMetrics.has(numM.id)) {
            const boolVals = dayMetrics.get(boolM.id)!;
            const numVals = dayMetrics.get(numM.id)!;

            const isTrue = boolVals.some((v) => this.extractBoolean(v) === true);
            const numNumeric = numVals
              .map((v) => this.extractNumeric(v))
              .filter((v): v is number => v !== null);

            if (numNumeric.length > 0) {
              const dayAvg = numNumeric.reduce((a, b) => a + b, 0) / numNumeric.length;
              if (isTrue) {
                trueDaysValues.push(dayAvg);
              } else {
                falseDaysValues.push(dayAvg);
              }
            }
          }
        }

        const totalSharedDays = trueDaysValues.length + falseDaysValues.length;

        // Minimum evidence requirement: at least 3 shared calendar days, with at least 1 in each state
        if (totalSharedDays < 3 || trueDaysValues.length < 1 || falseDaysValues.length < 1) {
          continue;
        }

        const avgTrue = trueDaysValues.reduce((a, b) => a + b, 0) / trueDaysValues.length;
        const avgFalse = falseDaysValues.reduce((a, b) => a + b, 0) / falseDaysValues.length;
        const diff = avgTrue - avgFalse;

        // Notable association difference (at least 0.4 for rating or 4% for numeric)
        const isNotableDiff =
          numM.type === MetricType.RATING
            ? Math.abs(diff) >= 0.4
            : Math.abs(diff) >= Math.max(0.5, Math.abs(avgFalse) * 0.04);

        if (!isNotableDiff) continue;

        const roundedTrue = Math.round(avgTrue * 10) / 10;
        const roundedFalse = Math.round(avgFalse * 10) / 10;
        const comparisonWord = diff < 0 ? 'lower' : 'higher';

        insights.push({
          id: `rel-${boolM.id}-${numM.id}`,
          type: 'relationship',
          category: 'info',
          title: `Observed Association: ${boolM.name} & ${numM.name}`,
          message: `On days where ${boolM.name} was recorded as completed, the recorded ${numM.name} tended to be ${comparisonWord} (averaging ${roundedTrue} vs ${roundedFalse} on other recorded days).`,
          metricId: numM.id,
          metricName: numM.name,
          evidence: {
            conditionMetricName: boolM.name,
            targetMetricName: numM.name,
            sharedDaysCount: totalSharedDays,
            completedDaysCount: trueDaysValues.length,
            otherDaysCount: falseDaysValues.length,
            averageWhenCompleted: roundedTrue,
            averageOtherwise: roundedFalse,
          },
        });
      }
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

  private checkGoalCondition(
    actual: number,
    target: number,
    operator: GoalOperator
  ): boolean {
    switch (operator) {
      case GoalOperator.GTE:
        return actual >= target;
      case GoalOperator.LTE:
        return actual <= target;
      case GoalOperator.EQ:
        return actual === target;
      default:
        return actual >= target;
    }
  }

  private formatOperator(operator: GoalOperator): string {
    switch (operator) {
      case GoalOperator.GTE:
        return '≥';
      case GoalOperator.LTE:
        return '≤';
      case GoalOperator.EQ:
        return '=';
      default:
        return '≥';
    }
  }
}

export const insightService = new InsightService();
