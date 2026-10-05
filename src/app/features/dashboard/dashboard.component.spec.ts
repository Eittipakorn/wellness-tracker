import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { InsightService } from '../../core/services/insight.service';
import {
  DashboardData,
  MetricSummaryItem,
  RecentRecordItem,
} from '../../core/models/dashboard.models';
import {
  InsightItem,
  InsightResponseData,
} from '../../core/models/insight.models';

describe('DashboardComponent', () => {
  let injector: Injector;
  let component: DashboardComponent;
  let mockDashboardService: {
    getDashboard: ReturnType<typeof vi.fn>;
  };
  let mockInsightService: {
    getInsights: ReturnType<typeof vi.fn>;
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

  const sampleInsights: InsightItem[] = [
    {
      id: 'ins-1',
      type: 'trend',
      category: 'positive',
      title: 'ดื่มน้ำสม่ำเสมอ',
      message: 'คุณดื่มน้ำถึงเป้าหมาย 6 วันในรอบสัปดาห์',
      metricId: 'm-num',
      metricName: 'ดื่มน้ำ',
      evidence: { achievementRate: 85 },
    },
    {
      id: 'ins-2',
      type: 'pattern',
      category: 'warning',
      title: 'ระดับความเครียดเพิ่มสูงขึ้น',
      message: 'ความเครียดมีแนวโน้มเพิ่มขึ้นในช่วงบ่าย',
      metricId: 'm-rating',
      metricName: 'ระดับความเครียด',
      evidence: { direction: 'increasing' },
    },
    {
      id: 'ins-3',
      type: 'suggestion',
      category: 'info',
      title: 'ลองออกกำลังกายตอนเช้า',
      message: 'การออกกำลังกายช่วยปรับสมดุลสุขภาพจิตใจ',
      metricId: 'm-bool',
      metricName: 'ออกกำลังกาย',
      evidence: { recordCount: 5 },
    },
    {
      id: 'ins-4',
      type: 'info',
      category: 'info',
      title: 'บันทึกข้อมูลครบถ้วน',
      message: 'คุณบันทึกข้อมูลต่อเนื่อง',
      evidence: {},
    },
  ];

  const sampleInsightResponseData: InsightResponseData = {
    summary: {
      totalInsights: 4,
      analyzedMetrics: 3,
      analyzedRecords: 22,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    insights: sampleInsights,
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

    mockInsightService = {
      getInsights: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: sampleInsightResponseData,
        })
      ),
    };

    injector = Injector.create({
      providers: [
        { provide: DashboardComponent },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: InsightService, useValue: mockInsightService },
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

  it('should map option UUID to human-readable label when optionsMap is populated', () => {
    component.optionsMap().set('opt-1', '🟡 ปกติ');
    component.optionsMap().set('opt-uuid-1', 'ปวดศีรษะ');
    component.optionsMap().set('opt-uuid-2', 'มีไข้');

    const singleRecord: RecentRecordItem = {
      ...sampleRecentRecords[3],
      value: { optionId: 'opt-1' },
    };
    expect(component.formatRecentRecordValue(singleRecord)).toBe('🟡 ปกติ');

    const multiRecord: RecentRecordItem = {
      ...sampleRecentRecords[4],
      value: { optionIds: ['opt-uuid-1', 'opt-uuid-2'] },
    };
    expect(component.formatRecentRecordValue(multiRecord)).toBe('ปวดศีรษะ, มีไข้');
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

  // --- Step 6E Integration Tests ---

  // 13. InsightService is called with default days = 7
  it('should call InsightService with default days = 7 on init', () => {
    component.ngOnInit();
    expect(mockInsightService.getInsights).toHaveBeenCalledWith({ days: 7 });
    expect(component.isInsightLoading()).toBe(false);
    expect(component.insightData()).toEqual(sampleInsightResponseData);
    expect(component.insightErrorMessage()).toBeNull();
  });

  // 14. Insight preview renders returned insights
  it('should format insight preview items correctly with icons, labels, and classes', () => {
    component.ngOnInit();
    const preview = component.previewInsights();
    expect(preview.length).toBeGreaterThan(0);

    expect(component.getInsightCategoryLabel('positive')).toBe('เชิงบวก');
    expect(component.getInsightCategoryLabel('warning')).toBe('ข้อควรระวัง');
    expect(component.getInsightCategoryLabel('info')).toBe('ข้อมูลทั่วไป');

    expect(component.getInsightCategoryBadgeClass('positive')).toBe('badge-positive');
    expect(component.getInsightCategoryBadgeClass('warning')).toBe('badge-warning');
    expect(component.getInsightCategoryBadgeClass('info')).toBe('badge-info');

    expect(component.getInsightCategoryCardClass('positive')).toBe('card-positive');
    expect(component.getInsightCategoryCardClass('warning')).toBe('card-warning');
    expect(component.getInsightCategoryCardClass('info')).toBe('card-info');

    expect(component.getInsightTypeLabel('trend')).toBe('แนวโน้ม');
    expect(component.getInsightTypeLabel('pattern')).toBe('รูปแบบ');
    expect(component.getInsightTypeLabel('relationship')).toBe('ความสัมพันธ์');
    expect(component.getInsightTypeLabel('goal_progress')).toBe('ความคืบหน้าเป้าหมาย');
    expect(component.getInsightTypeLabel('suggestion')).toBe('คำแนะนำ');
    expect(component.getInsightTypeLabel('info')).toBe('ข้อมูล');

    expect(component.getInsightTypeIcon('trend')).toBe('📈');
    expect(component.getInsightTypeIcon('pattern')).toBe('🔁');
    expect(component.getInsightTypeIcon('relationship')).toBe('🔗');
    expect(component.getInsightTypeIcon('goal_progress')).toBe('🎯');
    expect(component.getInsightTypeIcon('suggestion')).toBe('💡');
    expect(component.getInsightTypeIcon('info')).toBe('ℹ️');
  });

  // 15. Maximum 3 insights are displayed
  it('should display at most 3 insights in previewInsights even when more are returned', () => {
    component.ngOnInit();
    expect(sampleInsightResponseData.insights.length).toBe(4);
    expect(component.previewInsights().length).toBe(3);
  });

  // 16. Warning insights are prioritized over positive/info
  it('should prioritize warning insights over positive and info insights', () => {
    const mixedInsights: InsightItem[] = [
      { id: '1', type: 'info', category: 'info', title: 'I1', message: 'M', evidence: {} },
      { id: '2', type: 'trend', category: 'positive', title: 'P1', message: 'M', evidence: {} },
      { id: '3', type: 'pattern', category: 'warning', title: 'W1', message: 'M', evidence: {} },
      { id: '4', type: 'suggestion', category: 'info', title: 'I2', message: 'M', evidence: {} },
      { id: '5', type: 'pattern', category: 'warning', title: 'W2', message: 'M', evidence: {} },
    ];

    mockInsightService.getInsights.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          summary: sampleInsightResponseData.summary,
          insights: mixedInsights,
        },
      })
    );

    component.ngOnInit();
    const preview = component.previewInsights();
    expect(preview).toHaveLength(3);
    expect(preview[0].id).toBe('3'); // W1
    expect(preview[1].id).toBe('5'); // W2
    expect(preview[2].id).toBe('2'); // P1
  });

  // 17. Positive insights are prioritized over info when no warning exists
  it('should prioritize positive insights over info when no warning exists', () => {
    const positiveAndInfo: InsightItem[] = [
      { id: 'i1', type: 'info', category: 'info', title: 'I1', message: 'M', evidence: {} },
      { id: 'p1', type: 'trend', category: 'positive', title: 'P1', message: 'M', evidence: {} },
      { id: 'i2', type: 'suggestion', category: 'info', title: 'I2', message: 'M', evidence: {} },
      { id: 'p2', type: 'trend', category: 'positive', title: 'P2', message: 'M', evidence: {} },
      { id: 'i3', type: 'info', category: 'info', title: 'I3', message: 'M', evidence: {} },
    ];

    mockInsightService.getInsights.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          summary: sampleInsightResponseData.summary,
          insights: positiveAndInfo,
        },
      })
    );

    component.ngOnInit();
    const preview = component.previewInsights();
    expect(preview).toHaveLength(3);
    expect(preview[0].id).toBe('p1');
    expect(preview[1].id).toBe('p2');
    expect(preview[2].id).toBe('i1');
  });

  // 18. Dashboard period changes from 7 → 30 and InsightService is called with days = 30
  it('should update InsightService call with days = 30 when dashboard period changes to 30', () => {
    component.ngOnInit();
    expect(mockInsightService.getInsights).toHaveBeenCalledWith({ days: 7 });

    component.loadDashboard(30);

    expect(component.selectedDays()).toBe(30);
    expect(mockDashboardService.getDashboard).toHaveBeenCalledWith({ days: 30 });
    expect(mockInsightService.getInsights).toHaveBeenCalledWith({ days: 30 });
  });

  // 19. Insight loading state does not block Dashboard content
  it('should not block dashboard rendering while insights are still loading', () => {
    component.loadDashboard(7);

    expect(component.isLoading()).toBe(false);
    expect(component.dashboardData()).toEqual(sampleDashboardData);
    expect(component.dashboardData()?.overview.totalMetrics).toBe(6);
  });

  // 20. Insight API error does not break Dashboard
  it('should handle Insight API failure gracefully without breaking dashboard content', () => {
    mockInsightService.getInsights.mockReturnValueOnce(
      throwError(() => ({ status: 500, message: 'Insight service error' }))
    );

    component.loadDashboard(7);

    // Dashboard data remains fully intact and available
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.dashboardData()).toEqual(sampleDashboardData);

    // Insight preview reflects its own inline error
    expect(component.isInsightLoading()).toBe(false);
    expect(component.insightErrorMessage()).toBe('ไม่สามารถโหลด Insight ได้');
  });

  // 21. Insight retry uses the current Dashboard period
  it('should retry loading insights with the currently selected dashboard period', () => {
    component.selectedDays.set(30);

    mockInsightService.getInsights.mockReturnValueOnce(
      throwError(() => ({ status: 500, message: 'Failed' }))
    );
    component.loadInsightPreview(30);
    expect(component.insightErrorMessage()).toBe('ไม่สามารถโหลด Insight ได้');

    mockInsightService.getInsights.mockReturnValueOnce(
      of({ statusCode: 200, data: sampleInsightResponseData })
    );

    component.loadInsightPreview(component.selectedDays());

    expect(mockInsightService.getInsights).toHaveBeenLastCalledWith({ days: 30 });
    expect(component.isInsightLoading()).toBe(false);
    expect(component.insightErrorMessage()).toBeNull();
    expect(component.insightData()).toEqual(sampleInsightResponseData);
  });

  // 22. Cold-start and insufficient-data response renders normally
  it('should recognize cold-start and insufficient-data insights', () => {
    const coldStartInsight: InsightItem = {
      id: 'insight-cold-start',
      type: 'info',
      category: 'info',
      title: 'เริ่มต้นใช้งาน Glance',
      message: 'คุณยังไม่มีข้อมูลบันทึกในช่วงเวลานี้',
      evidence: {},
    };

    const insufficientDataInsight: InsightItem = {
      id: 'insight-insufficient-data',
      type: 'info',
      category: 'info',
      title: 'ต้องการข้อมูลเพิ่มเติม',
      message: 'บันทึกข้อมูลเพิ่มอีก 2 ครั้ง เพื่อเริ่มวิเคราะห์',
      evidence: {},
    };

    expect(component.isColdStart(coldStartInsight)).toBe(true);
    expect(component.isColdStart(insufficientDataInsight)).toBe(false);

    expect(component.isInsufficientData(insufficientDataInsight)).toBe(true);
    expect(component.isInsufficientData(coldStartInsight)).toBe(false);

    mockInsightService.getInsights.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          summary: sampleInsightResponseData.summary,
          insights: [coldStartInsight],
        },
      })
    );

    component.ngOnInit();
    expect(component.previewInsights()).toEqual([coldStartInsight]);
  });

  // 23. Empty insight array renders empty state
  it('should return empty preview array when no insights are available', () => {
    mockInsightService.getInsights.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          summary: {
            totalInsights: 0,
            analyzedMetrics: 0,
            analyzedRecords: 0,
            dateRange: { startDate: '2026-09-28', endDate: '2026-10-05', days: 7 },
          },
          insights: [],
        },
      })
    );

    component.ngOnInit();
    expect(component.previewInsights()).toEqual([]);
    expect(component.isInsightLoading()).toBe(false);
    expect(component.insightErrorMessage()).toBeNull();
  });

  // 24. Clean up subscriptions on destroy
  it('should unsubscribe from subscriptions on ngOnDestroy', () => {
    component.ngOnInit();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
