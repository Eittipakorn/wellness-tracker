import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { DashboardService } from './dashboard.service';
import { DashboardData } from '../models/dashboard.models';

describe('DashboardService', () => {
  let injector: Injector;
  let service: DashboardService;
  let mockHttpClient: {
    get: ReturnType<typeof vi.fn>;
  };

  const sampleDashboardData: DashboardData = {
    overview: {
      totalMetrics: 2,
      activeMetrics: 2,
      totalRecordsInRange: 5,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    metrics: [
      {
        id: 'm1',
        name: 'น้ำหนัก',
        type: 'NUMBER',
        unit: 'kg',
        description: 'น้ำหนักตัวตอนเช้า',
        isActive: true,
        group: null,
        summary: {
          totalRecords: 3,
          latestValue: 70.5,
          latestRecordedAt: '2026-10-04T08:00:00.000Z',
          average: 70.2,
          min: 69.8,
          max: 70.5,
        },
        trend: [
          { date: '2026-10-02', value: 69.8, count: 1 },
          { date: '2026-10-03', value: 70.3, count: 1 },
          { date: '2026-10-04', value: 70.5, count: 1 },
        ],
      },
      {
        id: 'm2',
        name: 'ออกกำลังกาย',
        type: 'BOOLEAN',
        unit: null,
        description: 'วิ่ง 30 นาที',
        isActive: true,
        group: { id: 'g1', name: 'สุขภาพกาย' },
        summary: {
          totalRecords: 2,
          latestValue: true,
          latestRecordedAt: '2026-10-04T18:00:00.000Z',
          trueCount: 2,
          falseCount: 0,
        },
        trend: [
          { date: '2026-10-03', trueCount: 1, falseCount: 0, totalCount: 1 },
          { date: '2026-10-04', trueCount: 1, falseCount: 0, totalCount: 1 },
        ],
      },
    ],
    recentRecords: [
      {
        id: 'r1',
        metricId: 'm2',
        metricName: 'ออกกำลังกาย',
        metricType: 'BOOLEAN',
        metricUnit: null,
        value: { value: true },
        note: 'วิ่งในสวน',
        recordedAt: '2026-10-04T18:00:00.000Z',
        createdAt: '2026-10-04T18:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        { provide: DashboardService },
        { provide: HttpClient, useValue: mockHttpClient },
      ],
    });

    service = injector.get(DashboardService);
  });

  it('1. should call /api/dashboard correctly without filters', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleDashboardData,
      })
    );

    service.getDashboard().subscribe((res) => {
      expect(res.data).toEqual(sampleDashboardData);
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/dashboard',
      expect.objectContaining({ params: expect.any(HttpParams) })
    );

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.keys()).toHaveLength(0);
  });

  it('2. should send days parameter correctly', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleDashboardData,
      })
    );

    service.getDashboard({ days: 30 }).subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.get('days')).toBe('30');
    expect(params.has('startDate')).toBe(false);
    expect(params.has('endDate')).toBe(false);
  });

  it('3. should send startDate and endDate parameters correctly', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleDashboardData,
      })
    );

    service
      .getDashboard({ startDate: '2026-09-01', endDate: '2026-09-30' })
      .subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.get('startDate')).toBe('2026-09-01');
    expect(params.get('endDate')).toBe('2026-09-30');
    expect(params.has('days')).toBe(false);
  });

  it('4. should not send undefined or unset query parameters', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleDashboardData,
      })
    );

    service.getDashboard({}).subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.keys()).toHaveLength(0);
  });

  it('5. should forward HTTP errors correctly', () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'startDate cannot be after endDate',
      },
    });

    mockHttpClient.get.mockReturnValue(throwError(() => errorResponse));

    let actualError: HttpErrorResponse | undefined;
    service
      .getDashboard({ startDate: '2026-10-10', endDate: '2026-10-01' })
      .subscribe({
        next: () => {
          throw new Error('Should not have succeeded');
        },
        error: (err) => {
          actualError = err;
        },
      });

    expect(actualError).toBeDefined();
    expect(actualError?.status).toBe(400);
    expect(actualError?.error.message).toBe('startDate cannot be after endDate');
  });

  it('6. should map response data to DashboardData model correctly', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleDashboardData,
      })
    );

    service.getDashboard().subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.data.overview.totalMetrics).toBe(2);
      expect(res.data.overview.activeMetrics).toBe(2);
      expect(res.data.overview.totalRecordsInRange).toBe(5);
      expect(res.data.overview.dateRange.days).toBe(7);

      expect(res.data.metrics).toHaveLength(2);
      expect(res.data.metrics[0].id).toBe('m1');
      expect(res.data.metrics[0].type).toBe('NUMBER');
      expect(res.data.metrics[0].summary.average).toBe(70.2);
      expect(res.data.metrics[0].trend).toHaveLength(3);

      expect(res.data.metrics[1].id).toBe('m2');
      expect(res.data.metrics[1].type).toBe('BOOLEAN');
      expect(res.data.metrics[1].group?.name).toBe('สุขภาพกาย');
      expect(res.data.metrics[1].summary.trueCount).toBe(2);

      expect(res.data.recentRecords).toHaveLength(1);
      expect(res.data.recentRecords[0].metricName).toBe('ออกกำลังกาย');
    });
  });
});
