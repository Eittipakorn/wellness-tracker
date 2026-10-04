import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../models/api.models';
import {
  CreateRecordRequest,
  MetricRecord,
  RecordFilters,
  UpdateRecordRequest,
} from '../models/record.models';

@Injectable({
  providedIn: 'root',
})
export class RecordService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_CONFIG.baseUrl}${API_CONFIG.records}`;

  getRecords(filters?: RecordFilters): Observable<ApiResponse<{ records: MetricRecord[] }>> {
    let params = new HttpParams();
    if (filters?.metricId) {
      params = params.set('metricId', filters.metricId);
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<ApiResponse<{ records: MetricRecord[] }>>(this.endpoint, { params });
  }

  getRecord(id: string): Observable<ApiResponse<{ record: MetricRecord }>> {
    return this.http.get<ApiResponse<{ record: MetricRecord }>>(`${this.endpoint}/${id}`);
  }

  createRecord(payload: CreateRecordRequest): Observable<ApiResponse<{ record: MetricRecord }>> {
    return this.http.post<ApiResponse<{ record: MetricRecord }>>(this.endpoint, payload);
  }

  updateRecord(
    id: string,
    payload: UpdateRecordRequest
  ): Observable<ApiResponse<{ record: MetricRecord }>> {
    return this.http.put<ApiResponse<{ record: MetricRecord }>>(`${this.endpoint}/${id}`, payload);
  }

  deleteRecord(id: string): Observable<ApiResponse<{ success: boolean }>> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.endpoint}/${id}`);
  }
}
