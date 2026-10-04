import { MetricType } from './metric.models';

export interface MetricSummary {
  id: string;
  name: string;
  type: MetricType;
  unit?: string | null;
}

export interface BooleanRecordValue {
  value: boolean;
}

export interface NumberRecordValue {
  value: number;
}

export interface RatingRecordValue {
  value: number;
}

export interface SingleSelectRecordValue {
  optionId: string;
}

export interface MultipleSelectRecordValue {
  optionIds: string[];
}

export interface TextRecordValue {
  value: string;
}

export type RecordValue =
  | BooleanRecordValue
  | NumberRecordValue
  | RatingRecordValue
  | SingleSelectRecordValue
  | MultipleSelectRecordValue
  | TextRecordValue
  | Record<string, unknown>;

export interface MetricRecord {
  id: string;
  metricId: string;
  value: RecordValue;
  note?: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  metric: MetricSummary;
}

export interface RecordFilters {
  metricId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateRecordRequest {
  metricId: string;
  value: unknown;
  note?: string;
  recordedAt?: string;
}

export interface UpdateRecordRequest {
  value?: unknown;
  note?: string | null;
  recordedAt?: string;
}
