import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MetricService } from '../../../core/services/metric.service';
import {
  Metric,
  MetricType,
  UpdateMetricRequest,
} from '../../../core/models/metric.models';

@Component({
  selector: 'app-edit-metric',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-metric.component.html',
  styleUrl: './edit-metric.component.css',
})
export class EditMetricComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly metricService = inject(MetricService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly metricId = signal<string | null>(null);
  readonly metric = signal<Metric | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  private optionIds: (string | null)[] = [];

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    unit: [''],
    ratingMin: [1],
    ratingMax: [5],
    isActive: [true],
    options: this.fb.array<FormControl<string>>([]),
  });

  get optionsArray(): FormArray<FormControl<string>> {
    return this.form.get('options') as FormArray<FormControl<string>>;
  }

  get metricType(): MetricType | null {
    return this.metric()?.type ?? null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError.set('ไม่พบรหัสตัวชี้วัดที่ต้องการแก้ไข');
      this.isLoading.set(false);
      return;
    }
    this.metricId.set(id);
    this.loadMetric(id);
  }

  loadMetric(id: string): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.metricService.getMetric(id).subscribe({
      next: (res) => {
        const m = res.data.metric;
        this.metric.set(m);

        this.form.patchValue({
          name: m.name,
          description: m.description || '',
          unit: m.unit || '',
          ratingMin: m.ratingMin ?? 1,
          ratingMax: m.ratingMax ?? 5,
          isActive: m.isActive,
        });

        if (m.type === 'SINGLE_SELECT' || m.type === 'MULTIPLE_SELECT') {
          this.optionsArray.clear();
          this.optionIds = [];
          if (m.options && m.options.length > 0) {
            for (const opt of m.options) {
              this.optionsArray.push(
                new FormControl(opt.label, { nonNullable: true })
              );
              this.optionIds.push(opt.id);
            }
          }
          // Ensure at least 2 option fields
          while (this.optionsArray.length < 2) {
            this.addOption();
          }
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.loadError.set('ไม่พบข้อมูลตัวชี้วัดนี้ในระบบ');
        } else {
          this.loadError.set('ไม่สามารถโหลดข้อมูลตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
  }

  addOption(): void {
    this.optionsArray.push(new FormControl('', { nonNullable: true }));
    this.optionIds.push(null);
  }

  removeOption(index: number): void {
    if (this.optionsArray.length > 2) {
      this.optionsArray.removeAt(index);
      this.optionIds.splice(index, 1);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getNameError(): string {
    const field = this.form.get('name');
    if (!field || !field.errors) return '';
    if (field.errors['required']) return 'กรุณากรอกชื่อตัวชี้วัด';
    return '';
  }

  getMetricTypeLabel(type: MetricType | null): string {
    if (!type) return '';
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

  onSubmit(): void {
    this.errorMessage.set(null);

    const name = this.form.value.name?.trim();
    if (!name) {
      this.form.get('name')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const type = this.metricType;
    if (!type) return;

    // Validate Rating min < max
    if (type === 'RATING') {
      const min = Number(this.form.value.ratingMin);
      const max = Number(this.form.value.ratingMax);

      if (isNaN(min) || isNaN(max)) {
        this.errorMessage.set('กรุณาระบุคะแนนต่ำสุดและสูงสุดเป็นตัวเลข');
        return;
      }
      if (min >= max) {
        this.errorMessage.set('คะแนนต่ำสุดต้องน้อยกว่าคะแนนสูงสุด');
        return;
      }
    }

    // Validate Select options
    if (type === 'SINGLE_SELECT' || type === 'MULTIPLE_SELECT') {
      const rawOptions = this.optionsArray.controls.map((c) => c.value.trim());

      if (rawOptions.length < 2) {
        this.errorMessage.set('กรุณาระบุตัวเลือกอย่างน้อย 2 รายการ');
        return;
      }

      const hasEmpty = rawOptions.some((opt) => opt.length === 0);
      if (hasEmpty) {
        this.errorMessage.set('กรุณากรอกข้อความตัวเลือกให้ครบถ้วนทุกช่อง');
        return;
      }

      const lowerLabels = rawOptions.map((o) => o.toLowerCase());
      const uniqueLabels = new Set(lowerLabels);
      if (uniqueLabels.size !== lowerLabels.length) {
        this.errorMessage.set('ตัวเลือกต้องไม่ซ้ำกัน');
        return;
      }
    }

    const payload: UpdateMetricRequest = {
      name,
      description: this.form.value.description?.trim() || null,
      isActive: !!this.form.value.isActive,
    };

    if (type === 'NUMBER') {
      payload.unit = this.form.value.unit?.trim() || null;
    }

    if (type === 'RATING') {
      payload.ratingMin = Number(this.form.value.ratingMin);
      payload.ratingMax = Number(this.form.value.ratingMax);
    }

    if (type === 'SINGLE_SELECT' || type === 'MULTIPLE_SELECT') {
      payload.options = this.optionsArray.controls.map((ctrl, index) => {
        const optId = this.optionIds[index];
        return {
          ...(optId ? { id: optId } : {}),
          label: ctrl.value.trim(),
          sortOrder: index,
        };
      });
    }

    const id = this.metricId();
    if (!id) return;

    this.isSubmitting.set(true);

    this.metricService.updateMetric(id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/metrics'], {
          queryParams: { edited: 'true' },
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.errorMessage.set(`มีตัวชี้วัดชื่อ "${name}" อยู่แล้ว กรุณาใช้ชื่ออื่น`);
        } else if (err.status === 400) {
          const msg = Array.isArray(err.error?.message)
            ? err.error.message.join(', ')
            : err.error?.message || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก';
          this.errorMessage.set(msg);
        } else if (err.status === 0) {
          this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } else {
          this.errorMessage.set('เกิดข้อผิดพลาดในการบันทึกตัวชี้วัด กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
  }
}
