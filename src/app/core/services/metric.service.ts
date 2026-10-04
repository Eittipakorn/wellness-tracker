import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../models/api.models';
import {
  CreateMetricRequest,
  Metric,
  UpdateMetricRequest,
} from '../models/metric.models';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_CONFIG.baseUrl}${API_CONFIG.metrics}`;

  getMetrics(): Observable<ApiResponse<{ metrics: Metric[] }>> {
    return this.http.get<ApiResponse<{ metrics: Metric[] }>>(this.endpoint);
  }

  getMetric(id: string): Observable<ApiResponse<{ metric: Metric }>> {
    return this.http.get<ApiResponse<{ metric: Metric }>>(`${this.endpoint}/${id}`);
  }

  createMetric(payload: CreateMetricRequest): Observable<ApiResponse<{ metric: Metric }>> {
    return this.http.post<ApiResponse<{ metric: Metric }>>(this.endpoint, payload);
  }

  updateMetric(
    id: string,
    payload: UpdateMetricRequest
  ): Observable<ApiResponse<{ metric: Metric }>> {
    return this.http.put<ApiResponse<{ metric: Metric }>>(`${this.endpoint}/${id}`, payload);
  }

  deleteMetric(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.endpoint}/${id}`);
  }
}
