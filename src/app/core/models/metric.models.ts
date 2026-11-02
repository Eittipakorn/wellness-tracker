export type MetricType =
  | 'BOOLEAN'
  | 'NUMBER'
  | 'RATING'
  | 'SINGLE_SELECT'
  | 'MULTIPLE_SELECT'
  | 'TEXT';

export interface MetricOption {
  id: string;
  metricId: string;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MetricGroupSummary {
  id: string;
  name: string;
}

export interface Metric {
  id: string;
  accountId: string;
  groupId?: string | null;
  name: string;
  description?: string | null;
  type: MetricType;
  unit?: string | null;
  ratingMin?: number | null;
  ratingMax?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  options: MetricOption[];
  group?: MetricGroupSummary | null;
}

export interface CreateMetricOptionRequest {
  label: string;
  sortOrder?: number;
}

export interface UpdateMetricOptionRequest {
  id?: string;
  label: string;
  sortOrder?: number;
}

export interface CreateMetricRequest {
  name: string;
  type: MetricType;
  description?: string;
  groupId?: string;
  unit?: string;
  ratingMin?: number;
  ratingMax?: number;
  isActive?: boolean;
  options?: CreateMetricOptionRequest[];
}

export interface UpdateMetricRequest {
  name?: string;
  description?: string | null;
  groupId?: string | null;
  unit?: string | null;
  ratingMin?: number | null;
  ratingMax?: number | null;
  isActive?: boolean;
  options?: UpdateMetricOptionRequest[];
}
