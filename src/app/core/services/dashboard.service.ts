import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../models/api.models';
import { DashboardData, DashboardFilters } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_CONFIG.baseUrl}${API_CONFIG.dashboard}`;

  getDashboard(filters?: DashboardFilters): Observable<ApiResponse<DashboardData>> {
    let params = new HttpParams();

    if (filters?.days !== undefined && filters?.days !== null) {
      params = params.set('days', filters.days.toString());
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<ApiResponse<DashboardData>>(this.endpoint, { params });
  }
}
