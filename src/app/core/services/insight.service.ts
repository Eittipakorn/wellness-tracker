import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../models/api.models';
import { InsightFilters, InsightResponseData } from '../models/insight.models';

@Injectable({
  providedIn: 'root',
})
export class InsightService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_CONFIG.baseUrl}${API_CONFIG.insights}`;

  getInsights(filters?: InsightFilters): Observable<ApiResponse<InsightResponseData>> {
    let params = new HttpParams();

    if (filters?.days !== undefined && filters?.days !== null) {
      params = params.set('days', filters.days.toString());
    }
    if (filters?.metricId) {
      params = params.set('metricId', filters.metricId);
    }

    return this.http.get<ApiResponse<InsightResponseData>>(this.endpoint, { params });
  }
}
