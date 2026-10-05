import { MetricGroupSummary, MetricType } from './metric.models';

export interface DashboardFilters {
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface DashboardDateRange {
  startDate: string;
  endDate: string;
  days: number;
}

export interface DashboardOverview {
  totalMetrics: number;
  activeMetrics: number;
  totalRecordsInRange: number;
  dateRange: DashboardDateRange;
}

export interface MetricSummary {
  totalRecords: number;
  latestValue: unknown;
  latestRecordedAt: string | null;
  average?: number | null;
  min?: number | null;
  max?: number | null;
  trueCount?: number;
  falseCount?: number;
  optionBreakdown?: Record<string, number>;
}

export interface NumericTrendPoint {
  date: string;
  value: number;
  count: number;
}

export interface BooleanTrendPoint {
  date: string;
  trueCount: number;
  falseCount: number;
  totalCount: number;
}

export interface OptionTrendPoint {
  date: string;
  counts: Record<string, number>;
}

export interface TextTrendPoint {
  date: string;
  count: number;
}

export type TrendPoint =
  | NumericTrendPoint
  | BooleanTrendPoint
  | OptionTrendPoint
  | TextTrendPoint
  | Record<string, unknown>;

export interface MetricSummaryItem {
  id: string;
  name: string;
  type: MetricType;
  unit: string | null;
  description: string | null;
  isActive: boolean;
  group: MetricGroupSummary | null;
  summary: MetricSummary;
  trend: TrendPoint[];
}

export interface RecentRecordItem {
  id: string;
  metricId: string;
  metricName: string;
  metricType: MetricType;
  metricUnit: string | null;
  value: unknown;
  note: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface DashboardData {
  overview: DashboardOverview;
  metrics: MetricSummaryItem[];
  recentRecords: RecentRecordItem[];
}
