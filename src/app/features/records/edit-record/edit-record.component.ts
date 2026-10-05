import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { RecordService } from '../../../core/services/record.service';
import { MetricService } from '../../../core/services/metric.service';
import { MetricRecord, UpdateRecordRequest } from '../../../core/models/record.models';
import { Metric, MetricType } from '../../../core/models/metric.models';

@Component({
  selector: 'app-edit-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-record.component.html',
  styleUrl: './edit-record.component.css',
})
export class EditRecordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly recordService = inject(RecordService);
  private readonly metricService = inject(MetricService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly record = signal<MetricRecord | null>(null);
  readonly metric = signal<Metric | null>(null);
  readonly selectedOptionIds = signal<string[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly isNotFound = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    recordedAt: ['', [Validators.required]],
    note: [''],
    booleanValue: [true],
    numberValue: [null as number | null],
    ratingValue: [null as number | null],
    singleSelectValue: [''],
    textValue: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNotFound.set(true);
      this.isLoading.set(false);
      return;
    }

    this.loadRecord(id);
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

  loadRecord(id: string): void {
    this.isLoading.set(true);
    this.isNotFound.set(false);
    this.loadError.set(null);
    this.errorMessage.set(null);

    this.recordService
      .getRecord(id)
      .pipe(
        switchMap((res) => {
          const rec = res.data.record;
          this.record.set(rec);
          return this.metricService.getMetric(rec.metricId);
        })
      )
      .subscribe({
        next: (metricRes) => {
          const met = metricRes.data.metric;
          this.metric.set(met);
          this.populateForm(this.record()!, met);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 404) {
            this.isNotFound.set(true);
          } else {
            this.loadError.set('ไม่สามารถโหลดข้อมูลการบันทึกได้ กรุณาลองใหม่อีกครั้ง');
          }
        },
      });
  }

  populateForm(record: MetricRecord, metric: Metric): void {
    const recDate = new Date(record.recordedAt);
    const dateStr = isNaN(recDate.getTime())
      ? this.getLocalDatetimeString()
      : this.getLocalDatetimeString(recDate);

    this.form.patchValue({
      recordedAt: dateStr,
      note: record.note ?? '',
    });

    const val = record.value as any;

    switch (metric.type) {
      case 'BOOLEAN': {
        const b = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        this.form.patchValue({ booleanValue: Boolean(b) });
        break;
      }
      case 'NUMBER': {
        const num = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        this.form.patchValue({ numberValue: typeof num === 'number' ? num : Number(num) });
        break;
      }
      case 'RATING': {
        const rating = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
        this.form.patchValue({ ratingValue: typeof rating === 'number' ? rating : Number(rating) });
        break;
      }
      case 'SINGLE_SELECT': {
        const optId = typeof val === 'object' && val !== null && 'optionId' in val ? val.optionId : String(val ?? '');
        this.form.patchValue({ singleSelectValue: optId });
        break;
      }
      case 'MULTIPLE_SELECT': {
        const optIds: string[] =
          typeof val === 'object' && val !== null && 'optionIds' in val
            ? val.optionIds
            : Array.isArray(val)
              ? val
              : [];
        this.selectedOptionIds.set([...optIds]);
        break;
      }
      case 'TEXT': {
        const txt = typeof val === 'object' && val !== null && 'value' in val ? val.value : String(val ?? '');
        this.form.patchValue({ textValue: txt });
        break;
      }
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

    const record = this.record();
    const metric = this.metric();
    if (!record || !metric) {
      this.errorMessage.set('ไม่พบข้อมูลสำหรับการแก้ไข');
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

    const payload: UpdateRecordRequest = {
      value: formattedValue,
      recordedAt: recordedDate.toISOString(),
      note: this.form.value.note?.trim() || null,
    };

    this.isSubmitting.set(true);

    this.recordService.updateRecord(record.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/records'], {
          queryParams: { updated: 'true' },
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
          this.errorMessage.set('ไม่พบรายการบันทึกนี้ในระบบ');
        } else if (err.status === 0) {
          this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } else {
          this.errorMessage.set('เกิดข้อผิดพลาดในการแก้ไขข้อมูล กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
  }
}
