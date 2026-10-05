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

export interface InsightDateRange {
  startDate: string;
  endDate: string;
  days: number;
}

export interface InsightSummary {
  totalInsights: number;
  analyzedMetrics: number;
  analyzedRecords: number;
  dateRange: InsightDateRange;
}

export interface InsightResponseData {
  summary: InsightSummary;
  insights: InsightItem[];
}

export type InsightData = InsightResponseData;

export interface InsightFilters {
  days?: number;
  metricId?: string;
}
