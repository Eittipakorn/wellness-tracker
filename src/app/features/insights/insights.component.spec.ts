import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { InsightsComponent } from './insights.component';
import { InsightService } from '../../core/services/insight.service';
import {
  InsightItem,
  InsightResponseData,
} from '../../core/models/insight.models';

describe('InsightsComponent', () => {
  let injector: Injector;
  let component: InsightsComponent;
  let mockInsightService: {
    getInsights: ReturnType<typeof vi.fn>;
  };

  const sampleTrendInsight: InsightItem = {
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
      recordCount: 8,
    },
  };

  const samplePatternInsight: InsightItem = {
    id: 'insight-pattern-1',
    type: 'pattern',
    category: 'info',
    title: 'Consistent Exercise on Weekdays',
    message: 'You tend to log workout sessions mostly from Monday to Wednesday.',
    metricId: 'm-exercise',
    metricName: 'Workout',
    evidence: {
      peakDay: 'Monday',
    },
  };

  const sampleWarningInsight: InsightItem = {
    id: 'insight-warning-1',
    type: 'suggestion',
    category: 'warning',
    title: 'High Stress Levels Detected',
    message: 'Your stress rating has stayed above 7 for 3 consecutive days.',
    metricId: 'm-stress',
    metricName: 'Stress Level',
    evidence: {
      currentAverage: 7.8,
    },
  };

  const sampleGoalInsight: InsightItem = {
    id: 'goal-progress-1',
    type: 'goal_progress',
    category: 'positive',
    title: 'Goal Progress: Daily Steps',
    message: 'You met your target on 5 of 7 days (71%).',
    metricId: 'm-steps',
    metricName: 'Daily Steps',
    evidence: {
      daysMet: 5,
      totalRecordedDays: 7,
      achievementRate: 71,
      target: 10000,
    },
  };

  const sampleRelationshipInsight: InsightItem = {
    id: 'rel-1',
    type: 'relationship',
    category: 'info',
    title: 'Sleep and Mood Association',
    message: 'Higher sleep hours correlate with better mood ratings.',
    evidence: {
      sharedDays: 6,
    },
  };

  const sampleInsightsData: InsightResponseData = {
    summary: {
      totalInsights: 5,
      analyzedMetrics: 4,
      analyzedRecords: 28,
      dateRange: {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        days: 7,
      },
    },
    insights: [
      sampleTrendInsight,
      samplePatternInsight,
      sampleWarningInsight,
      sampleGoalInsight,
      sampleRelationshipInsight,
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
    mockInsightService = {
      getInsights: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: sampleInsightsData,
        })
      ),
    };

    injector = Injector.create({
      providers: [
        { provide: InsightsComponent },
        { provide: InsightService, useValue: mockInsightService },
      ],
    });

    component = injector.get(InsightsComponent);
  });

  // 1. renders the page
  it('1. should create the component successfully', () => {
    expect(component).toBeTruthy();
    expect(component.selectedDays()).toBe(7);
  });

  // 2. calls InsightService with default days = 7
  it('2. should call InsightService with default days = 7 on init', () => {
    component.ngOnInit();

    expect(mockInsightService.getInsights).toHaveBeenCalledWith({ days: 7 });
    expect(component.isLoading()).toBe(false);
    expect(component.insightData()).toEqual(sampleInsightsData);
    expect(component.errorMessage()).toBeNull();
  });

  // 3. displays summary data
  it('3. should store summary data correctly after load', () => {
    component.ngOnInit();

    const summary = component.insightData()?.summary;
    expect(summary).toBeDefined();
    expect(summary?.totalInsights).toBe(5);
    expect(summary?.analyzedMetrics).toBe(4);
    expect(summary?.analyzedRecords).toBe(28);
    expect(summary?.dateRange.days).toBe(7);

    const formattedRange = component.formatDateRange(summary!.dateRange);
    expect(formattedRange).toContain('วัน');
    expect(formattedRange).toContain('2569');
  });

  // 4. displays returned insight cards
  it('4. should hold all returned insight cards', () => {
    component.ngOnInit();

    const insights = component.insightData()?.insights;
    expect(insights).toHaveLength(5);
    expect(insights?.[0].title).toBe('Upward Trend in Water Intake');
    expect(insights?.[0].metricName).toBe('Water Intake');
  });

  // 5. displays category/type correctly
  it('5. should provide correct Thai labels, badge classes, and icons for categories and types', () => {
    expect(component.getCategoryLabel('positive')).toBe('เชิงบวก');
    expect(component.getCategoryLabel('warning')).toBe('ข้อควรระวัง');
    expect(component.getCategoryLabel('info')).toBe('ข้อมูลทั่วไป');

    expect(component.getCategoryBadgeClass('positive')).toBe('badge-positive');
    expect(component.getCategoryBadgeClass('warning')).toBe('badge-warning');
    expect(component.getCategoryBadgeClass('info')).toBe('badge-info');

    expect(component.getTypeLabel('trend')).toBe('แนวโน้ม');
    expect(component.getTypeLabel('pattern')).toBe('รูปแบบ');
    expect(component.getTypeLabel('relationship')).toBe('ความสัมพันธ์');
    expect(component.getTypeLabel('goal_progress')).toBe('ความคืบหน้าเป้าหมาย');
    expect(component.getTypeLabel('suggestion')).toBe('คำแนะนำ');
    expect(component.getTypeLabel('info')).toBe('ข้อมูล');

    expect(component.getTypeIcon('trend')).toBe('📈');
    expect(component.getTypeIcon('pattern')).toBe('🔁');
    expect(component.getTypeIcon('relationship')).toBe('🔗');
    expect(component.getTypeIcon('goal_progress')).toBe('🎯');
    expect(component.getTypeIcon('suggestion')).toBe('💡');
    expect(component.getTypeIcon('info')).toBe('ℹ️');
  });

  // 6. changes 7 → 30 days and requests the API again
  it('6. should update selectedDays and request new data when period is changed to 30 days', () => {
    component.ngOnInit();
    expect(mockInsightService.getInsights).toHaveBeenCalledWith({ days: 7 });

    component.loadInsights(30);

    expect(component.selectedDays()).toBe(30);
    expect(mockInsightService.getInsights).toHaveBeenCalledWith({ days: 30 });
  });

  // 7. loading state
  it('7. should manage loading state properly', () => {
    expect(component.isLoading()).toBe(true);

    component.loadInsights(7);

    expect(component.isLoading()).toBe(false);
  });

  // 8. API error state
  it('8. should set error message when API fails', () => {
    mockInsightService.getInsights.mockReturnValueOnce(
      throwError(() => ({ status: 500, message: 'Server error' }))
    );

    component.loadInsights(7);

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('ไม่สามารถโหลดข้อมูลเชิงลึกได้ กรุณาลองใหม่อีกครั้ง');
    expect(component.insightData()).toBeNull();
  });

  // 9. retry action
  it('9. should recover on retry after an error', () => {
    mockInsightService.getInsights.mockReturnValueOnce(
      throwError(() => ({ status: 0, message: 'Network error' }))
    );

    component.loadInsights(7);
    expect(component.errorMessage()).toBe('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');

    mockInsightService.getInsights.mockReturnValueOnce(
      of({ statusCode: 200, data: sampleInsightsData })
    );

    component.loadInsights(component.selectedDays());

    expect(component.errorMessage()).toBeNull();
    expect(component.insightData()).toEqual(sampleInsightsData);
  });

  // 10. empty insights state
  it('10. should handle empty insights response correctly', () => {
    const emptyData: InsightResponseData = {
      summary: {
        totalInsights: 0,
        analyzedMetrics: 1,
        analyzedRecords: 5,
        dateRange: { startDate: '2026-09-28', endDate: '2026-10-05', days: 7 },
      },
      insights: [],
    };

    mockInsightService.getInsights.mockReturnValue(of({ statusCode: 200, data: emptyData }));

    component.loadInsights(7);

    expect(component.insightData()?.insights).toHaveLength(0);
    expect(component.insightData()?.summary.totalInsights).toBe(0);
  });

  // 11. cold-start / insufficient-data response renders normally
  it('11. should recognize and handle cold-start response correctly', () => {
    mockInsightService.getInsights.mockReturnValue(of({ statusCode: 200, data: sampleColdStartData }));

    component.loadInsights(7);

    const firstInsight = component.insightData()!.insights[0];
    expect(component.isColdStart(firstInsight)).toBe(true);
    expect(component.isInsufficientData(firstInsight)).toBe(false);
    expect(firstInsight.id).toBe('insight-cold-start');
  });

  it('12. should recognize and handle insufficient data response correctly', () => {
    mockInsightService.getInsights.mockReturnValue(of({ statusCode: 200, data: sampleInsufficientData }));

    component.loadInsights(7);

    const firstInsight = component.insightData()!.insights[0];
    expect(component.isColdStart(firstInsight)).toBe(false);
    expect(component.isInsufficientData(firstInsight)).toBe(true);
    expect(firstInsight.id).toBe('insight-insufficient-data');
  });

  // 13. formats evidence chips safely
  it('13. should format known evidence fields safely into human-readable chips', () => {
    const evidence = {
      direction: 'increasing',
      percentageChange: 25,
      recordCount: 10,
      peakDay: 'Monday',
      achievementRate: 85,
      daysMet: 6,
      totalRecordedDays: 7,
      target: 8,
      currentAverage: 7.2,
      currentRecords: 2,
      minimumRecordsRequired: 3,
      sharedDays: 5,
    };

    const formatted = component.formatEvidence(evidence);
    expect(formatted.length).toBeGreaterThan(5);

    const dirItem = formatted.find((i) => i.label === 'ทิศทางแนวโน้ม');
    expect(dirItem?.value).toBe('เพิ่มขึ้น');

    const changeItem = formatted.find((i) => i.label === 'การเปลี่ยนแปลง');
    expect(changeItem?.value).toBe('+25%');

    const peakDayItem = formatted.find((i) => i.label === 'วันที่มีกิจกรรมสูงสุด');
    expect(peakDayItem?.value).toBe('วันจันทร์');

    expect(component.formatEvidence(undefined)).toEqual([]);
    expect(component.formatEvidence({} as any)).toEqual([]);
  });

  // 14. handles missing or null dateRange safely
  it('14. should handle invalid or null date range safely', () => {
    expect(component.formatDateRange(undefined)).toBe('-');
    expect(component.formatDateRange({ startDate: '', endDate: '', days: 7 })).toBe('-');
    expect(component.formatDateRange({ startDate: 'invalid', endDate: 'invalid', days: 7 })).toBe('-');
  });
});
