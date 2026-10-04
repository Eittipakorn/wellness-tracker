export type InsightType =
  | 'trend'
  | 'pattern'
  | 'relationship'
  | 'goal_progress'
  | 'suggestion'
  | 'info';

export type InsightCategory = 'positive' | 'warning' | 'info';

export interface InsightEvidence {
  [key: string]: unknown;
}

export interface InsightItem {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  message: string;
  metricId?: string;
  metricName?: string;
  evidence: InsightEvidence;
}

export interface InsightResponseData {
  summary: {
    totalInsights: number;
    analyzedMetrics: number;
    analyzedRecords: number;
    dateRange: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  insights: InsightItem[];
}

export interface InsightQueryOptions {
  days?: number;
  metricId?: string;
}
