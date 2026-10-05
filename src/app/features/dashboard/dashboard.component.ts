import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../core/services/dashboard.service';
import { InsightService } from '../../core/services/insight.service';
import { MetricService } from '../../core/services/metric.service';
import {
  DashboardData,
  DashboardDateRange,
  MetricSummaryItem,
  RecentRecordItem,
  BooleanTrendPoint,
} from '../../core/models/dashboard.models';
import {
  InsightCategory,
  InsightItem,
  InsightResponseData,
  InsightType,
} from '../../core/models/insight.models';
import { MetricType } from '../../core/models/metric.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly insightService = inject(InsightService);
  private readonly metricService = inject(MetricService, { optional: true });

  private dashboardSub?: Subscription;
  private insightSub?: Subscription;
  private metricsSub?: Subscription;

  readonly selectedDays = signal<number>(7);
  readonly optionsMap = signal<Map<string, string>>(new Map());
  readonly dashboardData = signal<DashboardData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Insight Preview State
  readonly insightData = signal<InsightResponseData | null>(null);
  readonly isInsightLoading = signal<boolean>(true);
  readonly insightErrorMessage = signal<string | null>(null);

  // Top 3 prioritized preview insights: warning -> positive -> info
  readonly previewInsights = computed<InsightItem[]>(() => {
    const data = this.insightData();
    if (!data?.insights || data.insights.length === 0) return [];

    const warnings = data.insights.filter((i) => i.category === 'warning');
    const positives = data.insights.filter((i) => i.category === 'positive');
    const infos = data.insights.filter((i) => i.category === 'info');
    const others = data.insights.filter(
      (i) => i.category !== 'warning' && i.category !== 'positive' && i.category !== 'info'
    );

    return [...warnings, ...positives, ...infos, ...others].slice(0, 3);
  });

  ngOnInit(): void {
    this.loadMetricsOptions();
    this.loadDashboard(this.selectedDays());
  }

  ngOnDestroy(): void {
    this.dashboardSub?.unsubscribe();
    this.insightSub?.unsubscribe();
    this.metricsSub?.unsubscribe();
  }

  loadMetricsOptions(): void {
    if (!this.metricService) return;
    this.metricsSub?.unsubscribe();
    this.metricsSub = this.metricService
      .getMetrics()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (res) => {
          if (res?.data?.metrics) {
            const map = new Map<string, string>();
            for (const m of res.data.metrics) {
              if (m.options) {
                for (const opt of m.options) {
                  map.set(opt.id, opt.label);
                }
              }
            }
            this.optionsMap.set(map);
          }
        },
      });
  }

  loadDashboard(days: number): void {
    this.selectedDays.set(days);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardSub?.unsubscribe();
    this.dashboardSub = this.dashboardService.getDashboard({ days }).subscribe({
      next: (res) => {
        if (this.selectedDays() === days) {
          this.dashboardData.set(res.data);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        if (this.selectedDays() === days) {
          this.isLoading.set(false);
          this.errorMessage.set(
            err.status === 0
              ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
              : 'ไม่สามารถโหลดข้อมูลภาพรวมได้ กรุณาลองใหม่อีกครั้ง'
          );
        }
      },
    });

    this.loadInsightPreview(days);
  }

  loadInsightPreview(days: number): void {
    this.isInsightLoading.set(true);
    this.insightErrorMessage.set(null);

    this.insightSub?.unsubscribe();
    this.insightSub = this.insightService.getInsights({ days }).subscribe({
      next: (res) => {
        if (this.selectedDays() === days) {
          this.insightData.set(res.data);
          this.isInsightLoading.set(false);
        }
      },
      error: (err) => {
        if (this.selectedDays() === days) {
          this.isInsightLoading.set(false);
          this.insightErrorMessage.set(
            err.status === 0
              ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
              : 'ไม่สามารถโหลด Insight ได้'
          );
        }
      },
    });
  }

  formatDateRange(dateRange: DashboardDateRange): string {
    if (!dateRange?.startDate || !dateRange?.endDate) return '-';
    const s = new Date(dateRange.startDate);
    const e = new Date(dateRange.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '-';

    const shortMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];

    const sDay = s.getDate();
    const sMonth = shortMonths[s.getMonth()];
    const eDay = e.getDate();
    const eMonth = shortMonths[e.getMonth()];
    const endYear = e.getFullYear();

    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${endYear} (${dateRange.days} วัน)`;
  }

  formatThaiDateTime(isoDate: string | null | undefined): string {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return String(isoDate);

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];

    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const yearCE = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${yearCE} · ${hours}:${minutes} น.`;
  }

  formatDateShort(dateStr: unknown): string {
    if (typeof dateStr !== 'string' || !dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      const shortMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      return `${parseInt(parts[2], 10)} ${shortMonths[monthIdx] || ''}`;
    }
    return dateStr;
  }

  getTrendStartDate(trend: unknown[]): string {
    if (!trend || trend.length === 0) return '';
    const first = trend[0] as { date?: string } | undefined;
    return this.formatDateShort(first?.date);
  }

  getTrendEndDate(trend: unknown[]): string {
    if (!trend || trend.length === 0) return '';
    const last = trend[trend.length - 1] as { date?: string } | undefined;
    return this.formatDateShort(last?.date);
  }

  getBooleanTrend(metric: MetricSummaryItem): BooleanTrendPoint[] {
    return (metric.trend as BooleanTrendPoint[]) || [];
  }

  isBooleanPointTrue(day: BooleanTrendPoint): boolean {
    return (day.trueCount || 0) > 0;
  }

  isBooleanPointFalse(day: BooleanTrendPoint): boolean {
    return (day.falseCount || 0) > 0 && (day.trueCount || 0) === 0;
  }

  formatLatestValue(metric: MetricSummaryItem): string {
    const val = metric.summary.latestValue;
    if (val === null || val === undefined) return '-';

    switch (metric.type) {
      case 'BOOLEAN':
        return val === true ? '✓ ทำแล้ว / ใช่' : '✗ ไม่ได้ทำ / ไม่ใช่';
      case 'NUMBER':
        return `${val}${metric.unit ? ' ' + metric.unit : ''}`;
      case 'RATING':
        return String(val);
      case 'SINGLE_SELECT':
        if (typeof val === 'object' && val !== null && 'label' in val) {
          return String((val as { label: unknown }).label);
        }
        return String(val);
      case 'MULTIPLE_SELECT':
        if (Array.isArray(val)) {
          const labels = val
            .map((item) => (typeof item === 'object' && item !== null && 'label' in item ? item.label : item))
            .filter(Boolean);
          return labels.length > 0 ? labels.join(', ') : '-';
        }
        return String(val);
      case 'TEXT':
        return String(val);
      default:
        return String(val);
    }
  }

  formatRecentRecordValue(record: RecentRecordItem): string {
    const val = record.value as any;
    if (val === undefined || val === null) return '-';

    switch (record.metricType) {
      case 'BOOLEAN': {
        const b = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        return b ? '✓ ใช่ / ทำแล้ว' : '✗ ไม่ใช่ / ไม่ได้ทำ';
      }
      case 'NUMBER': {
        const num = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        const unit = record.metricUnit ? ` ${record.metricUnit}` : '';
        return `${num}${unit}`;
      }
      case 'RATING': {
        const rating = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        return `${rating}`;
      }
      case 'SINGLE_SELECT': {
        const optId = typeof val === 'object' && val !== null && 'optionId' in val ? val.optionId : val;
        const directLabel = typeof val === 'object' && val !== null && 'label' in val ? val.label : null;
        if (directLabel) return String(directLabel);
        const mappedLabel = optId ? this.optionsMap().get(optId) : null;
        return mappedLabel || String(optId || '-');
      }
      case 'MULTIPLE_SELECT': {
        const optIds: string[] =
          typeof val === 'object' && val !== null && 'optionIds' in val
            ? val.optionIds
            : Array.isArray(val)
              ? val
              : [];
        const labels = optIds.map((id) => this.optionsMap().get(id) || id);
        return labels.length > 0 ? labels.join(', ') : '-';
      }
      case 'TEXT': {
        const txt = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        return txt || '-';
      }
      default:
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
    }
  }

  getMetricTypeLabel(type: MetricType): string {
    switch (type) {
      case 'BOOLEAN':
        return 'เช็ก / ไม่เช็ก';
      case 'NUMBER':
        return 'ตัวเลข';
      case 'RATING':
        return 'คะแนน';
      case 'SINGLE_SELECT':
        return 'เลือกหนึ่งรายการ';
      case 'MULTIPLE_SELECT':
        return 'เลือกได้หลายรายการ';
      case 'TEXT':
        return 'ข้อความ';
      default:
        return type;
    }
  }

  getTypeBadgeClass(type: MetricType): string {
    switch (type) {
      case 'BOOLEAN':
        return 'badge-boolean';
      case 'NUMBER':
        return 'badge-number';
      case 'RATING':
        return 'badge-rating';
      case 'SINGLE_SELECT':
        return 'badge-single-select';
      case 'MULTIPLE_SELECT':
        return 'badge-multi-select';
      case 'TEXT':
        return 'badge-text';
      default:
        return 'badge-default';
    }
  }

  getTrendPoints(
    trend: any[],
    width = 240,
    height = 50,
    padding = 6
  ): { x: number; y: number; val: number; date: string }[] {
    if (!trend || trend.length === 0) return [];
    const valid = trend.filter(
      (t) => t && t.value !== undefined && t.value !== null && !isNaN(Number(t.value))
    );
    if (valid.length === 0) return [];

    const values = valid.map((t) => Number(t.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return valid.map((t, i) => {
      const x =
        valid.length === 1 ? width / 2 : padding + (i / (valid.length - 1)) * (width - 2 * padding);
      const val = Number(t.value);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val,
        date: t.date,
      };
    });
  }

  getPolylinePoints(trend: any[], width = 240, height = 50, padding = 6): string {
    const points = this.getTrendPoints(trend, width, height, padding);
    if (points.length < 2) return '';
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  getOptionBreakdownEntries(
    breakdown: Record<string, number> | undefined
  ): { label: string; count: number }[] {
    if (!breakdown) return [];
    return Object.entries(breakdown).map(([label, count]) => ({ label, count }));
  }

  getInsightCategoryLabel(category: InsightCategory): string {
    switch (category) {
      case 'positive':
        return 'เชิงบวก';
      case 'warning':
        return 'ข้อควรระวัง';
      case 'info':
        return 'ข้อมูลทั่วไป';
      default:
        return category;
    }
  }

  getInsightCategoryBadgeClass(category: InsightCategory): string {
    switch (category) {
      case 'positive':
        return 'badge-positive';
      case 'warning':
        return 'badge-warning';
      case 'info':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  }

  getInsightCategoryCardClass(category: InsightCategory): string {
    switch (category) {
      case 'positive':
        return 'card-positive';
      case 'warning':
        return 'card-warning';
      case 'info':
        return 'card-info';
      default:
        return 'card-info';
    }
  }

  getInsightTypeLabel(type: InsightType): string {
    switch (type) {
      case 'trend':
        return 'แนวโน้ม';
      case 'pattern':
        return 'รูปแบบ';
      case 'relationship':
        return 'ความสัมพันธ์';
      case 'goal_progress':
        return 'ความคืบหน้าเป้าหมาย';
      case 'suggestion':
        return 'คำแนะนำ';
      case 'info':
        return 'ข้อมูล';
      default:
        return type;
    }
  }

  getInsightTypeIcon(type: InsightType): string {
    switch (type) {
      case 'trend':
        return '📈';
      case 'pattern':
        return '🔁';
      case 'relationship':
        return '🔗';
      case 'goal_progress':
        return '🎯';
      case 'suggestion':
        return '💡';
      case 'info':
        return 'ℹ️';
      default:
        return '✨';
    }
  }

  isColdStart(insight: InsightItem): boolean {
    return insight.id === 'insight-cold-start';
  }

  isInsufficientData(insight: InsightItem): boolean {
    return insight.id === 'insight-insufficient-data';
  }
}
