import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  DashboardData,
  DashboardDateRange,
  MetricSummaryItem,
  RecentRecordItem,
  BooleanTrendPoint,
} from '../../core/models/dashboard.models';
import { MetricType } from '../../core/models/metric.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly selectedDays = signal<number>(7);
  readonly dashboardData = signal<DashboardData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard(this.selectedDays());
  }

  loadDashboard(days: number): void {
    this.selectedDays.set(days);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardService.getDashboard({ days }).subscribe({
      next: (res) => {
        this.dashboardData.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 0
            ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
            : 'ไม่สามารถโหลดข้อมูลภาพรวมได้ กรุณาลองใหม่อีกครั้ง'
        );
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
    const eYearBE = e.getFullYear() + 543;

    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYearBE} (${dateRange.days} วัน)`;
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
    const yearBE = d.getFullYear() + 543;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${yearBE} · ${hours}:${minutes} น.`;
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
        const matchingMetric = this.dashboardData()?.metrics.find((m) => m.id === record.metricId);
        if (matchingMetric?.summary.optionBreakdown && optId) {
          // If label matches directly
          if (matchingMetric.summary.optionBreakdown[optId] !== undefined) return optId;
        }
        return String(optId || '-');
      }
      case 'MULTIPLE_SELECT': {
        const optIds: string[] =
          typeof val === 'object' && val !== null && 'optionIds' in val
            ? val.optionIds
            : Array.isArray(val)
              ? val
              : [];
        return optIds.length > 0 ? optIds.join(', ') : '-';
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
}
