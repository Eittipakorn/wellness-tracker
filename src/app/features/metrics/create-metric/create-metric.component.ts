import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MetricService } from '../../../core/services/metric.service';
import { CreateMetricRequest, MetricType } from '../../../core/models/metric.models';

interface TypeOption {
  value: MetricType;
  label: string;
  description: string;
}

@Component({
  selector: 'app-create-metric',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-metric.component.html',
  styleUrl: './create-metric.component.css',
})
export class CreateMetricComponent {
  private readonly fb = inject(FormBuilder);
  private readonly metricService = inject(MetricService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly typeOptions: TypeOption[] = [
    { value: 'BOOLEAN', label: 'เช็ก / ไม่เช็ก', description: 'ข้อมูล 2 สถานะ เช่น ใช่/ไม่ใช่, ทำ/ไม่ได้ทำ' },
    { value: 'NUMBER', label: 'ตัวเลข', description: 'ข้อมูลตัวเลขพร้อมหน่วย เช่น น้ำหนัก, จำนวนก้าว, เวลา' },
    { value: 'RATING', label: 'คะแนน', description: 'คะแนนประเมินตามช่วง เช่น ระดับความเครียด 1-5' },
    { value: 'SINGLE_SELECT', label: 'เลือกหนึ่งรายการ', description: 'เลือกตัวเลือกเดียวจากรายการที่กำหนด เช่น อารมณ์' },
    { value: 'MULTIPLE_SELECT', label: 'เลือกได้หลายรายการ', description: 'เลือกได้หลายตัวเลือก เช่น อาการที่พบ' },
    { value: 'TEXT', label: 'ข้อความ', description: 'บันทึกข้อความสั้นหรือโน้ตสรุปประจำวัน' },
  ];

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    type: ['BOOLEAN' as MetricType, [Validators.required]],
    description: [''],
    unit: [''],
    ratingMin: [1],
    ratingMax: [5],
    options: this.fb.array<FormControl<string>>([]),
  });

  get optionsArray(): FormArray<FormControl<string>> {
    return this.form.get('options') as FormArray<FormControl<string>>;
  }

  get selectedType(): MetricType {
    return this.form.get('type')?.value as MetricType;
  }

  onTypeChange(type: MetricType): void {
    this.form.patchValue({ type });

    if (type === 'SINGLE_SELECT' || type === 'MULTIPLE_SELECT') {
      if (this.optionsArray.length === 0) {
        this.addOption();
        this.addOption();
      }
    } else {
      this.optionsArray.clear();
    }
  }

  addOption(): void {
    this.optionsArray.push(new FormControl('', { nonNullable: true }));
  }

  removeOption(index: number): void {
    if (this.optionsArray.length > 2) {
      this.optionsArray.removeAt(index);
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

  onSubmit(): void {
    this.errorMessage.set(null);

    const name = this.form.value.name?.trim();
    if (!name) {
      this.form.get('name')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const type = this.selectedType;

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

    // Build payload
    const payload: CreateMetricRequest = {
      name,
      type,
      description: this.form.value.description?.trim() || undefined,
    };

    if (type === 'NUMBER' && this.form.value.unit?.trim()) {
      payload.unit = this.form.value.unit.trim();
    }

    if (type === 'RATING') {
      payload.ratingMin = Number(this.form.value.ratingMin);
      payload.ratingMax = Number(this.form.value.ratingMax);
    }

    if (type === 'SINGLE_SELECT' || type === 'MULTIPLE_SELECT') {
      payload.options = this.optionsArray.controls.map((ctrl, index) => ({
        label: ctrl.value.trim(),
        sortOrder: index,
      }));
    }

    this.isLoading.set(true);

    this.metricService.createMetric(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/metrics'], {
          queryParams: { created: 'true' },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
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
          this.errorMessage.set('เกิดข้อผิดพลาดในการสร้างตัวชี้วัด กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
  }
}
