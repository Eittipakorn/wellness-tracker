import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  DashboardData,
  MetricSummaryItem,
  RecentRecordItem,
} from '../../core/models/dashboard.models';

describe('DashboardComponent', () => {
  let injector: Injector;
  let component: DashboardComponent;
  let mockDashboardService: {
    getDashboard: ReturnType<typeof vi.fn>;
  };

  const sampleNumberMetric: MetricSummaryItem = {
    id: 'm-num',
    name: 'ดื่มน้ำ',
    type: 'NUMBER',
    unit: 'แก้ว',
    description: 'บันทึกจำนวนแก้วน้ำ',
    isActive: true,
    group: { id: 'g1', name: 'สุขภาพกาย' },
    summary: {
      totalRecords: 10,
      latestValue: 8,
      latestRecordedAt: '2026-10-04T12:00:00.000Z',
      average: 7.5,
      min: 5,
      max: 10,
    },
    trend: [
      { date: '2026-10-01', value: 6, count: 1 },
      { date: '2026-10-02', value: 8, count: 1 },
      { date: '2026-10-03', value: 9, count: 1 },
    ],
  };

  const sampleRatingMetric: MetricSummaryItem = {
    id: 'm-rating',
    name: 'ระดับความเครียด',
    type: 'RATING',
    unit: null,
    description: null,
    isActive: true,
    group: null,
    summary: {
      totalRecords: 5,
      latestValue: 4,
      latestRecordedAt: '2026-10-04T15:00:00.000Z',
      average: 3.8,
      min: 2,
      max: 6,
    },
    trend: [
      { date: '2026-10-02', value: 3, count: 1 },
      { date: '2026-10-04', value: 4, count: 1 },
    ],
  };

  const sampleBooleanMetric: MetricSummaryItem = {
    id: 'm-bool',
    name: 'ออกกำลังกาย',
    type: 'BOOLEAN',
    unit: null,
    description: null,
    isActive: true,
    group: null,
    summary: {
      totalRecords: 7,
      latestValue: true,
      latestRecordedAt: '2026-10-04T18:00:00.000Z',
      trueCount: 5,
      falseCount: 2,
    },
    trend: [
      { date: '2026-10-01', trueCount: 1, falseCount: 0, totalCount: 1 },
      { date: '2026-10-02', trueCount: 0, falseCount: 1, totalCount: 1 },
      { date: '2026-10-03', trueCount: 1, falseCount: 0, totalCount: 1 },
    ],
  };

  const sampleSelectMetric: MetricSummaryItem = {
    id: 'm-select',
    name: 'อารมณ์',
    type: 'SINGLE_SELECT',
    unit: null,
    description: null,
    isActive: true,
    group: null,
    summary: {
      totalRecords: 6,
      latestValue: { optionId: 'opt-1', label: 'สดชื่น' },
      latestRecordedAt: '2026-10-04T09:00:00.000Z',
      optionBreakdown: {
        'สดชื่น': 4,
        'เหนื่อยล้า': 2,
      },
    },
    trend: [
      { date: '2026-10-01', counts: { 'สดชื่น': 1 } },
      { date: '2026-10-02', counts: { 'เหนื่อยล้า': 1 } },
    ],
  };

  const sampleMultiSelectMetric: MetricSummaryItem = {
    id: 'm-multi',
    name: 'อาการข้างเคียง',
    type: 'MULTIPLE_SELECT',
    unit: null,
    description: null,
    isActive: true,
    group: null,
    summary: {
      totalRecords: 3,
      latestValue: [{ optionId: 'opt-a', label: 'ปวดหัว' }, { optionId: 'opt-b', label: 'นอนไม่หลับ' }],
      latestRecordedAt: '2026-10-04T22:00:00.000Z',
      optionBreakdown: {
        'ปวดหัว': 2,
        'นอนไม่หลับ': 1,
      },
    },
    trend: [],
  };

  const sampleTextMetric: MetricSummaryItem = {
    id: 'm-text',
    name: 'บันทึกประจำวัน',
    type: 'TEXT',
    unit: null,
    description: null,
    isActive: false,
    group: null,
    summary: {
      totalRecords: 2,
      latestValue: 'วันนี้รู้สึกแจ่มใสและทำงานได้มีสมาธิ',
      latestRecordedAt: '2026-10-04T21:00:00.000Z',
    },
    trend: [
      { date: '2026-10-03', count: 1 },
      { date: '2026-10-04', count: 1 },
    ],
  };

  const sampleRecentRecords: RecentRecordItem[] = [
    {
      id: 'rec-1',
      metricId: 'm-num',
      metricName: 'ดื่มน้ำ',
      metricType: 'NUMBER',
      metricUnit: 'แก้ว',
      value: { value: 8 },
      note: 'ช่วงบ่าย',
      recordedAt: '2026-10-04T12:00:00.000Z',
      createdAt: '2026-10-04T12:00:00.000Z',
    },
    {
      id: 'rec-2',
      metricId: 'm-bool',
      metricName: 'ออกกำลังกาย',
      metricType: 'BOOLEAN',
      metricUnit: null,
      value: { value: true },
      note: null,
      recordedAt: '2026-10-04T18:00:00.000Z',
      createdAt: '2026-10-04T18:00:00.000Z',
    },
    {
      id: 'rec-3',
      metricId: 'm-rating',
      metricName: 'ระดับความเครียด',
      metricType: 'RATING',
      metricUnit: null,
      value: { value: 4 },
      note: 'ก่อนนอน',
      recordedAt: '2026-10-04T15:00:00.000Z',
      createdAt: '2026-10-04T15:00:00.000Z',
    },
    {
      id: 'rec-4',
      metricId: 'm-select',
      metricName: 'อารมณ์',
      metricType: 'SINGLE_SELECT',
      metricUnit: null,
      value: { optionId: 'opt-1' },
      note: null,
      recordedAt: '2026-10-04T09:00:00.000Z',
      createdAt: '2026-10-04T09:00:00.000Z',
    },
    {
      id: 'rec-5',
      metricId: 'm-multi',
      metricName: 'อาการข้างเคียง',
      metricType: 'MULTIPLE_SELECT',
      metricUnit: null,
      value: { optionIds: ['ปวดหัว', 'นอนไม่หลับ'] },
      note: null,
      recordedAt: '2026-10-04T22:00:00.000Z',
      createdAt: '2026-10-04T22:00:00.000Z',
    },
    {
      id: 'rec-6',
      metricId: 'm-text',
      metricName: 'บันทึกประจำวัน',
      metricType: 'TEXT',
      metricUnit: null,
      value: { value: 'วันนี้รู้สึกแจ่มใส' },
      note: null,
      recordedAt: '2026-10-04T21:00:00.000Z',
      createdAt: '2026-10-04T21:00:00.000Z',
    },
  ];

  const sampleDashboardData: DashboardData = {
    overview: {
      totalMetrics: 6,
      activeMetrics: 5,
      totalRecordsInRange: 30,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    metrics: [
      sampleNumberMetric,
      sampleRatingMetric,
      sampleBooleanMetric,
      sampleSelectMetric,
      sampleMultiSelectMetric,
      sampleTextMetric,
    ],
    recentRecords: sampleRecentRecords,
  };

  beforeEach(() => {
    mockDashboardService = {
      getDashboard: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: sampleDashboardData,
        })
      ),
    };

    injector = Injector.create({
      providers: [
        { provide: DashboardComponent },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    });

    component = injector.get(DashboardComponent);
  });

  // 1. component โหลดได้
  it('should initialize and load dashboard with default 7 days', () => {
    expect(component).toBeTruthy();
    expect(component.selectedDays()).toBe(7);

    component.ngOnInit();

    expect(mockDashboardService.getDashboard).toHaveBeenCalledWith({ days: 7 });
    expect(component.isLoading()).toBe(false);
    expect(component.dashboardData()).toEqual(sampleDashboardData);
    expect(component.errorMessage()).toBeNull();
  });

  // 2. แสดง overview
  it('should hold overview data correctly after loading', () => {
    component.ngOnInit();

    const overview = component.dashboardData()?.overview;
    expect(overview).toBeDefined();
    expect(overview?.totalMetrics).toBe(6);
    expect(overview?.activeMetrics).toBe(5);
    expect(overview?.totalRecordsInRange).toBe(30);
    expect(overview?.dateRange.days).toBe(7);

    const formattedRange = component.formatDateRange(overview!.dateRange);
    expect(formattedRange).toContain('วัน');
  });

  // 3. แสดง metric summary
  it('should hold all metric summaries and respect active status and labels', () => {
    component.ngOnInit();

    const metrics = component.dashboardData()?.metrics;
    expect(metrics).toHaveLength(6);

    const inactiveMetric = metrics?.find((m) => m.id === 'm-text');
    expect(inactiveMetric?.isActive).toBe(false);

    expect(component.getMetricTypeLabel('NUMBER')).toBe('ตัวเลข');
    expect(component.getMetricTypeLabel('RATING')).toBe('คะแนน');
    expect(component.getMetricTypeLabel('BOOLEAN')).toBe('เช็ก / ไม่เช็ก');
    expect(component.getMetricTypeLabel('SINGLE_SELECT')).toBe('เลือกหนึ่งรายการ');
    expect(component.getMetricTypeLabel('MULTIPLE_SELECT')).toBe('เลือกได้หลายรายการ');
    expect(component.getMetricTypeLabel('TEXT')).toBe('ข้อความ');

    expect(component.getTypeBadgeClass('NUMBER')).toBe('badge-number');
    expect(component.getTypeBadgeClass('BOOLEAN')).toBe('badge-boolean');
  });

  // 4. แสดง NUMBER/RATING summary
  it('should format NUMBER and RATING summary and trend correctly', () => {
    component.ngOnInit();

    expect(component.formatLatestValue(sampleNumberMetric)).toBe('8 แก้ว');
    expect(component.formatLatestValue(sampleRatingMetric)).toBe('4');

    const trendPoints = component.getTrendPoints(sampleNumberMetric.trend);
    expect(trendPoints.length).toBe(3);
    expect(trendPoints[0].val).toBe(6);
    expect(trendPoints[2].val).toBe(9);

    const polyline = component.getPolylinePoints(sampleNumberMetric.trend);
    expect(polyline).toBeTruthy();
    expect(polyline).toContain(',');

    expect(component.getTrendStartDate(sampleNumberMetric.trend)).toBe('1 ต.ค.');
    expect(component.getTrendEndDate(sampleNumberMetric.trend)).toBe('3 ต.ค.');
  });

  // 5. แสดง BOOLEAN summary
  it('should format BOOLEAN summary, counts, and trend correctly', () => {
    component.ngOnInit();

    expect(component.formatLatestValue(sampleBooleanMetric)).toBe('✓ ทำแล้ว / ใช่');
    const boolTrend = component.getBooleanTrend(sampleBooleanMetric);
    expect(boolTrend).toHaveLength(3);

    expect(component.isBooleanPointTrue(boolTrend[0])).toBe(true);
    expect(component.isBooleanPointFalse(boolTrend[0])).toBe(false);
    expect(component.isBooleanPointTrue(boolTrend[1])).toBe(false);
    expect(component.isBooleanPointFalse(boolTrend[1])).toBe(true);
  });

  // 6. แสดง SELECT breakdown
  it('should format SINGLE_SELECT and MULTIPLE_SELECT summary and breakdowns', () => {
    component.ngOnInit();

    expect(component.formatLatestValue(sampleSelectMetric)).toBe('สดชื่น');
    expect(component.formatLatestValue(sampleMultiSelectMetric)).toBe('ปวดหัว, นอนไม่หลับ');

    const entries = component.getOptionBreakdownEntries(sampleSelectMetric.summary.optionBreakdown);
    expect(entries).toEqual([
      { label: 'สดชื่น', count: 4 },
      { label: 'เหนื่อยล้า', count: 2 },
    ]);
  });

  // 7. แสดง recent records
  it('should format recent records correctly according to their types', () => {
    component.ngOnInit();

    const records = component.dashboardData()?.recentRecords;
    expect(records).toHaveLength(6);

    expect(component.formatRecentRecordValue(records![0])).toBe('8 แก้ว');
    expect(component.formatRecentRecordValue(records![1])).toContain('ใช่');
    expect(component.formatRecentRecordValue(records![2])).toBe('4');
    expect(component.formatRecentRecordValue(records![3])).toBe('opt-1');
    expect(component.formatRecentRecordValue(records![4])).toBe('ปวดหัว, นอนไม่หลับ');
    expect(component.formatRecentRecordValue(records![5])).toBe('วันนี้รู้สึกแจ่มใส');
  });

  // 8. loading state
  it('should reflect loading state during fetch', () => {
    mockDashboardService.getDashboard.mockReturnValue(of({ statusCode: 200, data: sampleDashboardData }));

    expect(component.isLoading()).toBe(true);
    component.loadDashboard(7);
    expect(component.isLoading()).toBe(false);
  });

  // 9. empty state
  it('should handle empty state when totalMetrics is 0', () => {
    const emptyData: DashboardData = {
      overview: {
        totalMetrics: 0,
        activeMetrics: 0,
        totalRecordsInRange: 0,
        dateRange: { startDate: '2026-09-28', endDate: '2026-10-05', days: 7 },
      },
      metrics: [],
      recentRecords: [],
    };

    mockDashboardService.getDashboard.mockReturnValue(of({ statusCode: 200, data: emptyData }));

    component.loadDashboard(7);

    expect(component.dashboardData()?.overview.totalMetrics).toBe(0);
    expect(component.dashboardData()?.metrics).toHaveLength(0);
  });

  // 10. error state + retry
  it('should display error message on service failure and retry successfully', () => {
    mockDashboardService.getDashboard.mockReturnValueOnce(
      throwError(() => ({ status: 500, message: 'Server error' }))
    );

    component.loadDashboard(7);

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('ไม่สามารถโหลดข้อมูลภาพรวมได้ กรุณาลองใหม่อีกครั้ง');
    expect(component.dashboardData()).toBeNull();

    // Now retry
    mockDashboardService.getDashboard.mockReturnValueOnce(
      of({ statusCode: 200, data: sampleDashboardData })
    );

    component.loadDashboard(component.selectedDays());

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.dashboardData()).toEqual(sampleDashboardData);
  });

  // 11. เปลี่ยนช่วงเวลา 7/30 วันแล้วเรียก service ใหม่
  it('should update selectedDays and request new data when date range changes', () => {
    component.ngOnInit();
    expect(mockDashboardService.getDashboard).toHaveBeenCalledWith({ days: 7 });

    component.loadDashboard(30);

    expect(component.selectedDays()).toBe(30);
    expect(mockDashboardService.getDashboard).toHaveBeenCalledWith({ days: 30 });
  });

  // 12. ไม่เกิด error เมื่อค่าบาง field เป็น null
  it('should handle null, undefined, and missing fields safely without throwing errors', () => {
    const metricWithNulls: MetricSummaryItem = {
      id: 'm-null',
      name: 'ไร้ข้อมูล',
      type: 'NUMBER',
      unit: null,
      description: null,
      isActive: false,
      group: null,
      summary: {
        totalRecords: 0,
        latestValue: null,
        latestRecordedAt: null,
        average: null,
        min: null,
        max: null,
      },
      trend: [],
    };

    const recordWithNulls: RecentRecordItem = {
      id: 'rec-null',
      metricId: 'm-null',
      metricName: 'ไร้ข้อมูล',
      metricType: 'NUMBER',
      metricUnit: null,
      value: null,
      note: null,
      recordedAt: '',
      createdAt: '',
    };

    expect(component.formatLatestValue(metricWithNulls)).toBe('-');
    expect(component.formatRecentRecordValue(recordWithNulls)).toBe('-');
    expect(component.getTrendPoints([])).toEqual([]);
    expect(component.getPolylinePoints([])).toBe('');
    expect(component.getTrendStartDate([])).toBe('');
    expect(component.getTrendEndDate([])).toBe('');
    expect(component.getOptionBreakdownEntries(undefined)).toEqual([]);
    expect(component.formatDateRange({} as any)).toBe('-');
    expect(component.formatThaiDateTime(null)).toBe('-');
    expect(component.formatDateShort('')).toBe('');
  });
});
