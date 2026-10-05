import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { InsightService } from './insight.service';
import { InsightResponseData } from '../models/insight.models';

describe('InsightService', () => {
  let injector: Injector;
  let service: InsightService;
  let mockHttpClient: {
    get: ReturnType<typeof vi.fn>;
  };

  const sampleInsightData: InsightResponseData = {
    summary: {
      totalInsights: 2,
      analyzedMetrics: 3,
      analyzedRecords: 15,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    insights: [
      {
        id: 'insight-trend-1',
        type: 'trend',
        category: 'positive',
        title: 'Upward Trend in Water Intake',
        message: 'Your water intake has increased by 25% over the past 7 days.',
        metricId: 'm-water',
        metricName: 'Water Intake',
        evidence: {
          direction: 'increasing',
          percentageChange: 25,
          startValue: 6,
          endValue: 8,
        },
      },
      {
        id: 'insight-pattern-1',
        type: 'pattern',
        category: 'info',
        title: 'Consistent Exercise on Weekdays',
        message: 'You tend to log workout sessions mostly from Monday to Wednesday.',
        metricId: 'm-exercise',
        metricName: 'Workout',
        evidence: {
          peakDay: 'Monday',
          activeDays: ['Monday', 'Tuesday', 'Wednesday'],
        },
      },
    ],
  };

  const sampleColdStartData: InsightResponseData = {
    summary: {
      totalInsights: 1,
      analyzedMetrics: 2,
      analyzedRecords: 0,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    insights: [
      {
        id: 'insight-cold-start',
        type: 'info',
        category: 'info',
        title: 'Getting Started with Glance',
        message:
          'No entries were recorded in the selected period. Start logging your daily metrics to discover trends, patterns, and progress.',
        evidence: {
          recordCount: 0,
          periodDays: 7,
        },
      },
    ],
  };

  const sampleInsufficientData: InsightResponseData = {
    summary: {
      totalInsights: 1,
      analyzedMetrics: 1,
      analyzedRecords: 2,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    insights: [
      {
        id: 'insight-insufficient-data',
        type: 'info',
        category: 'info',
        title: 'Building Your Data Profile',
        message:
          'You have logged 2 entries so far. Continue tracking over the coming days to unlock trends, patterns, and associations.',
        evidence: {
          currentRecords: 2,
          minimumRecordsRequired: 3,
        },
      },
    ],
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        { provide: InsightService },
        { provide: HttpClient, useValue: mockHttpClient },
      ],
    });

    service = injector.get(InsightService);
  });

  // 1. GET /api/insights with default/no filters
  it('1. should call /api/insights with no query params when filters are omitted', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsightData,
      })
    );

    service.getInsights().subscribe((res) => {
      expect(res.data).toEqual(sampleInsightData);
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/insights',
      expect.objectContaining({ params: expect.any(HttpParams) })
    );

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.keys()).toHaveLength(0);
  });

  // 2. days query parameter
  it('2. should append days query parameter correctly', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsightData,
      })
    );

    service.getInsights({ days: 30 }).subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.get('days')).toBe('30');
    expect(params.has('metricId')).toBe(false);
  });

  // 3. metricId query parameter if supported
  it('3. should append metricId query parameter correctly', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsightData,
      })
    );

    service.getInsights({ metricId: '550e8400-e29b-41d4-a716-446655440000' }).subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.get('metricId')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(params.has('days')).toBe(false);
  });

  // 4. multiple supported query parameters together
  it('4. should append multiple query parameters (days + metricId) together', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsightData,
      })
    );

    service
      .getInsights({
        days: 14,
        metricId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      })
      .subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.get('days')).toBe('14');
    expect(params.get('metricId')).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(params.keys()).toHaveLength(2);
  });

  // 5. response mapping / returned data
  it('5. should map response data to InsightResponseData model correctly', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsightData,
      })
    );

    service.getInsights().subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.data.summary.totalInsights).toBe(2);
      expect(res.data.summary.analyzedMetrics).toBe(3);
      expect(res.data.summary.analyzedRecords).toBe(15);
      expect(res.data.summary.dateRange.days).toBe(7);

      expect(res.data.insights).toHaveLength(2);
      expect(res.data.insights[0].id).toBe('insight-trend-1');
      expect(res.data.insights[0].type).toBe('trend');
      expect(res.data.insights[0].category).toBe('positive');
      expect(res.data.insights[0].metricName).toBe('Water Intake');
      expect(res.data.insights[0].evidence['direction']).toBe('increasing');

      expect(res.data.insights[1].id).toBe('insight-pattern-1');
      expect(res.data.insights[1].type).toBe('pattern');
      expect(res.data.insights[1].category).toBe('info');
    });
  });

  // 6. API error propagation
  it('6. should forward HTTP errors correctly', () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid metricId format. Expected a valid UUID.',
      },
    });

    mockHttpClient.get.mockReturnValue(throwError(() => errorResponse));

    let actualError: HttpErrorResponse | undefined;
    service.getInsights({ metricId: 'invalid-id' }).subscribe({
      next: () => {
        throw new Error('Should not have succeeded');
      },
      error: (err) => {
        actualError = err;
      },
    });

    expect(actualError).toBeDefined();
    expect(actualError?.status).toBe(400);
    expect(actualError?.error.message).toBe('Invalid metricId format. Expected a valid UUID.');
  });

  // 7. empty/cold-start and insufficient-data responses
  it('7. should correctly handle cold-start response when 0 records exist', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleColdStartData,
      })
    );

    service.getInsights().subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.data.summary.totalInsights).toBe(1);
      expect(res.data.summary.analyzedRecords).toBe(0);
      expect(res.data.insights).toHaveLength(1);
      expect(res.data.insights[0].id).toBe('insight-cold-start');
      expect(res.data.insights[0].type).toBe('info');
      expect(res.data.insights[0].category).toBe('info');
      expect(res.data.insights[0].title).toBe('Getting Started with Glance');
    });
  });

  it('8. should correctly handle insufficient data response when records are below threshold', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsufficientData,
      })
    );

    service.getInsights().subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.data.summary.totalInsights).toBe(1);
      expect(res.data.summary.analyzedRecords).toBe(2);
      expect(res.data.insights[0].id).toBe('insight-insufficient-data');
      expect(res.data.insights[0].type).toBe('info');
      expect(res.data.insights[0].evidence['minimumRecordsRequired']).toBe(3);
    });
  });

  it('9. should not send undefined, null, or empty query parameters', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: sampleInsightData,
      })
    );

    service.getInsights({ days: undefined, metricId: undefined }).subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.keys()).toHaveLength(0);
  });
});
