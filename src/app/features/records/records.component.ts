import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { RecordService } from '../../core/services/record.service';
import { MetricService } from '../../core/services/metric.service';
import { MetricRecord } from '../../core/models/record.models';
import { Metric, MetricType } from '../../core/models/metric.models';

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './records.component.html',
  styleUrl: './records.component.css',
})
export class RecordsComponent implements OnInit {
  private readonly recordService = inject(RecordService);
  private readonly metricService = inject(MetricService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly records = signal<MetricRecord[]>([]);
  readonly metricsMap = signal<Map<string, Metric>>(new Map());
  readonly optionsMap = signal<Map<string, string>>(new Map());
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly deletingRecordId = signal<string | null>(null);

  ngOnInit(): void {
    const params = this.route?.snapshot?.queryParamMap;
    if (params?.get('created') === 'true') {
      this.successMessage.set('บันทึกข้อมูลเรียบร้อยแล้ว');
    } else if (params?.get('updated') === 'true') {
      this.successMessage.set('แก้ไขข้อมูลเรียบร้อยแล้ว');
    }
    this.loadRecords();
  }

  onDelete(record: MetricRecord): void {
    if (this.deletingRecordId()) {
      return;
    }

    const isBrowser = typeof window !== 'undefined';
    const confirmed = isBrowser
      ? window.confirm('ต้องการลบข้อมูลนี้หรือไม่?\nข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้')
      : true;
    if (!confirmed) {
      return;
    }

    this.deletingRecordId.set(record.id);
    this.errorMessage.set(null);

    this.recordService.deleteRecord(record.id).subscribe({
      next: () => {
        this.records.set(this.records().filter((r) => r.id !== record.id));
        this.deletingRecordId.set(null);
        this.successMessage.set('ลบข้อมูลเรียบร้อยแล้ว');
      },
      error: () => {
        this.deletingRecordId.set(null);
        this.errorMessage.set('ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      },
    });
  }

  loadRecords(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      recordsRes: this.recordService.getRecords(),
      metricsRes: this.metricService.getMetrics().pipe(
        catchError(() => of({ statusCode: 200, data: { metrics: [] } }))
      ),
    }).subscribe({
      next: ({ recordsRes, metricsRes }) => {
        this.records.set(recordsRes.data.records);

        const metricMap = new Map<string, Metric>();
        const optionMap = new Map<string, string>();

        for (const m of metricsRes.data.metrics) {
          metricMap.set(m.id, m);
          if (m.options) {
            for (const opt of m.options) {
              optionMap.set(opt.id, opt.label);
            }
          }
        }

        this.metricsMap.set(metricMap);
        this.optionsMap.set(optionMap);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('ไม่สามารถโหลดข้อมูลการบันทึกได้ กรุณาลองใหม่อีกครั้ง');
        this.isLoading.set(false);
      },
    });
  }

  formatValue(record: MetricRecord): string {
    const val = record.value as any;
    if (val === undefined || val === null) return '-';

    switch (record.metric.type) {
      case 'BOOLEAN': {
        const b = typeof val === 'object' && 'value' in val ? val.value : val;
        return b ? '✓ ใช่ / ทำแล้ว' : '✗ ไม่ใช่ / ไม่ได้ทำ';
      }
      case 'NUMBER': {
        const num = typeof val === 'object' && 'value' in val ? val.value : val;
        const unit = record.metric.unit ? ` ${record.metric.unit}` : '';
        return `${num}${unit}`;
      }
      case 'RATING': {
        const rating = typeof val === 'object' && 'value' in val ? val.value : val;
        const metricConfig = this.metricsMap().get(record.metricId);
        const max = metricConfig?.ratingMax ?? 5;
        return `${rating} / ${max}`;
      }
      case 'SINGLE_SELECT': {
        const optId = typeof val === 'object' && 'optionId' in val ? val.optionId : val;
        const label = this.optionsMap().get(optId);
        return label || optId || '-';
      }
      case 'MULTIPLE_SELECT': {
        const optIds: string[] =
          typeof val === 'object' && 'optionIds' in val
            ? val.optionIds
            : Array.isArray(val)
              ? val
              : [];
        const labels = optIds.map((id) => this.optionsMap().get(id) || id);
        return labels.length > 0 ? labels.join(', ') : '-';
      }
      case 'TEXT': {
        const txt = typeof val === 'object' && 'value' in val ? val.value : val;
        return txt || '-';
      }
      default:
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
    }
  }

  getMultipleSelectLabels(record: MetricRecord): string[] {
    const val = record.value as any;
    if (!val) return [];
    const optIds: string[] =
      typeof val === 'object' && 'optionIds' in val
        ? val.optionIds
        : Array.isArray(val)
          ? val
          : [];
    return optIds.map((id) => this.optionsMap().get(id) || id);
  }

  formatThaiDateTime(isoDate: string): string {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;

    const thaiMonths = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ];

    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const yearBE = d.getFullYear() + 543;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${yearBE} · ${hours}:${minutes} น.`;
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
}
