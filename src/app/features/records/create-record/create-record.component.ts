import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecordService } from '../../../core/services/record.service';
import { MetricService } from '../../../core/services/metric.service';
import { Metric, MetricType } from '../../../core/models/metric.models';
import { CreateRecordRequest } from '../../../core/models/record.models';

@Component({
  selector: 'app-create-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-record.component.html',
  styleUrl: './create-record.component.css',
})
export class CreateRecordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly recordService = inject(RecordService);
  private readonly metricService = inject(MetricService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeMetrics = signal<Metric[]>([]);
  readonly selectedMetric = signal<Metric | null>(null);
  readonly selectedOptionIds = signal<string[]>([]);

  readonly isLoadingMetrics = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    metricId: ['', [Validators.required]],
    recordedAt: [this.getLocalDatetimeString(), [Validators.required]],
    note: [''],
    booleanValue: [true],
    numberValue: [null as number | null],
    ratingValue: [null as number | null],
    singleSelectValue: [''],
    textValue: [''],
  });

  ngOnInit(): void {
    this.loadActiveMetrics();
  }

  getLocalDatetimeString(date: Date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  loadActiveMetrics(): void {
    this.isLoadingMetrics.set(true);
    this.loadError.set(null);

    this.metricService.getMetrics().subscribe({
      next: (res) => {
        const active = res.data.metrics.filter((m) => m.isActive);
        this.activeMetrics.set(active);
        this.isLoadingMetrics.set(false);

        // Pre-select metric from queryParam or first active metric
        const queryMetricId = this.route.snapshot.queryParamMap.get('metricId');
        if (queryMetricId) {
          const found = active.find((m) => m.id === queryMetricId);
          if (found) {
            this.selectMetric(found);
            return;
          }
        }

        if (active.length > 0) {
          this.selectMetric(active[0]);
        }
      },
      error: () => {
        this.isLoadingMetrics.set(false);
        this.loadError.set('ไม่สามารถโหลดรายการตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
      },
    });
  }

  onMetricChange(metricId: string): void {
    const metric = this.activeMetrics().find((m) => m.id === metricId);
    if (metric) {
      this.selectMetric(metric);
    } else {
      this.selectedMetric.set(null);
      this.form.patchValue({ metricId: '' });
    }
  }

  selectMetric(metric: Metric): void {
    this.selectedMetric.set(metric);
    this.form.patchValue({ metricId: metric.id });
    this.selectedOptionIds.set([]);

    // Initialize defaults based on type
    switch (metric.type) {
      case 'BOOLEAN':
        this.form.patchValue({ booleanValue: true });
        break;
      case 'NUMBER':
        this.form.patchValue({ numberValue: null });
        break;
      case 'RATING':
        this.form.patchValue({ ratingValue: metric.ratingMin ?? 1 });
        break;
      case 'SINGLE_SELECT':
        if (metric.options && metric.options.length > 0) {
          this.form.patchValue({ singleSelectValue: metric.options[0].id });
        } else {
          this.form.patchValue({ singleSelectValue: '' });
        }
        break;
      case 'MULTIPLE_SELECT':
        this.selectedOptionIds.set([]);
        break;
      case 'TEXT':
        this.form.patchValue({ textValue: '' });
        break;
    }
  }

  toggleOptionId(optionId: string): void {
    const current = this.selectedOptionIds();
    if (current.includes(optionId)) {
      this.selectedOptionIds.set(current.filter((id) => id !== optionId));
    } else {
      this.selectedOptionIds.set([...current, optionId]);
    }
  }

  isOptionSelected(optionId: string): boolean {
    return this.selectedOptionIds().includes(optionId);
  }

  getRatingOptions(metric: Metric): number[] {
    const min = metric.ratingMin ?? 1;
    const max = metric.ratingMax ?? 5;
    const count = max - min + 1;
    if (count <= 10 && count > 0) {
      return Array.from({ length: count }, (_, i) => min + i);
    }
    return [];
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

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);

    const metric = this.selectedMetric();
    if (!metric) {
      this.errorMessage.set('กรุณาเลือกรายการติดตาม');
      return;
    }

    const recordedAtVal = this.form.value.recordedAt;
    if (!recordedAtVal) {
      this.errorMessage.set('กรุณาระบุวันที่และเวลาที่บันทึก');
      return;
    }

    const recordedDate = new Date(recordedAtVal);
    if (isNaN(recordedDate.getTime())) {
      this.errorMessage.set('รูปแบบวันที่และเวลาไม่ถูกต้อง');
      return;
    }

    // Backend rule: recordedAt cannot be in the future (with 1-min tolerance)
    if (recordedDate.getTime() > Date.now() + 60000) {
      this.errorMessage.set('วันที่และเวลาที่บันทึกต้องไม่เป็นเวลาในอนาคต');
      return;
    }

    if (recordedDate.getFullYear() < 1900) {
      this.errorMessage.set('ปีที่บันทึกต้องไม่ต่ำกว่า ค.ศ. 1900');
      return;
    }

    // Prepare and validate value according to MetricType
    let formattedValue: unknown;

    switch (metric.type) {
      case 'BOOLEAN': {
        const val = this.form.value.booleanValue;
        formattedValue = { value: Boolean(val) };
        break;
      }
      case 'NUMBER': {
        const val = this.form.value.numberValue;
        if (val === null || val === undefined || isNaN(Number(val))) {
          this.errorMessage.set('กรุณาระบุค่าตัวเลขที่ถูกต้อง');
          return;
        }
        formattedValue = { value: Number(val) };
        break;
      }
      case 'RATING': {
        const val = this.form.value.ratingValue;
        if (val === null || val === undefined || isNaN(Number(val))) {
          this.errorMessage.set('กรุณาระบุคะแนน');
          return;
        }
        const numVal = Number(val);
        const min = metric.ratingMin ?? 1;
        const max = metric.ratingMax ?? 5;
        if (numVal < min || numVal > max) {
          this.errorMessage.set(`กรุณาระบุคะแนนระหว่าง ${min} ถึง ${max}`);
          return;
        }
        formattedValue = { value: numVal };
        break;
      }
      case 'SINGLE_SELECT': {
        const optionId = this.form.value.singleSelectValue?.trim();
        if (!optionId) {
          this.errorMessage.set('กรุณาเลือกตัวเลือก');
          return;
        }
        formattedValue = { optionId };
        break;
      }
      case 'MULTIPLE_SELECT': {
        const optionIds = this.selectedOptionIds();
        if (!optionIds || optionIds.length === 0) {
          this.errorMessage.set('กรุณาเลือกอย่างน้อย 1 รายการ');
          return;
        }
        formattedValue = { optionIds };
        break;
      }
      case 'TEXT': {
        const val = this.form.value.textValue?.trim();
        if (!val) {
          this.errorMessage.set('กรุณากรอกข้อความ');
          return;
        }
        formattedValue = { value: val };
        break;
      }
    }

    const payload: CreateRecordRequest = {
      metricId: metric.id,
      value: formattedValue,
      recordedAt: recordedDate.toISOString(),
      note: this.form.value.note?.trim() || undefined,
    };

    this.isSubmitting.set(true);

    this.recordService.createRecord(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/records'], {
          queryParams: { created: 'true' },
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 400) {
          const msg = Array.isArray(err.error?.message)
            ? err.error.message.join(', ')
            : err.error?.message || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก';
          this.errorMessage.set(msg);
        } else if (err.status === 404) {
          this.errorMessage.set('ไม่พบรายการตัวชี้วัดนี้ในระบบ');
        } else if (err.status === 0) {
          this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } else {
          this.errorMessage.set('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
  }
}
