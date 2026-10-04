import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { EditMetricComponent } from './edit-metric.component';
import { MetricService } from '../../../core/services/metric.service';
import { Metric } from '../../../core/models/metric.models';

describe('EditMetricComponent', () => {
  let injector: Injector;
  let component: EditMetricComponent;
  let mockMetricService: {
    getMetric: ReturnType<typeof vi.fn>;
    updateMetric: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      paramMap: ReturnType<typeof convertToParamMap>;
    };
  };

  const sampleRatingMetric: Metric = {
    id: 'm-rating',
    accountId: 'u1',
    name: 'ความเครียด',
    type: 'RATING',
    ratingMin: 1,
    ratingMax: 5,
    description: 'ประเมินระดับความเครียดในแต่ละวัน',
    isActive: true,
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z',
    options: [],
  };

  const sampleSelectMetric: Metric = {
    id: 'm-select',
    accountId: 'u1',
    name: 'อารมณ์',
    type: 'SINGLE_SELECT',
    description: 'อารมณ์โดยรวม',
    isActive: true,
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z',
    options: [
      { id: 'o1', metricId: 'm-select', label: 'ดีมาก', sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'o2', metricId: 'm-select', label: 'ปกติ', sortOrder: 1, createdAt: '', updatedAt: '' },
    ],
  };

  beforeEach(() => {
    mockMetricService = {
      getMetric: vi.fn(),
      updateMetric: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: convertToParamMap({ id: 'm-rating' }),
      },
    };

    injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: EditMetricComponent },
        { provide: MetricService, useValue: mockMetricService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    component = injector.get(EditMetricComponent);
  });

  it('should load metric on init and patch form values', () => {
    mockMetricService.getMetric.mockReturnValue(
      of({
        statusCode: 200,
        data: { metric: sampleRatingMetric },
      })
    );

    component.ngOnInit();

    expect(mockMetricService.getMetric).toHaveBeenCalledWith('m-rating');
    expect(component.metric()).toEqual(sampleRatingMetric);
    expect(component.form.value.name).toBe('ความเครียด');
    expect(component.form.value.ratingMin).toBe(1);
    expect(component.form.value.ratingMax).toBe(5);
    expect(component.form.value.description).toBe('ประเมินระดับความเครียดในแต่ละวัน');
    expect(component.isLoading()).toBe(false);
  });

  it('should load options when editing a select metric', () => {
    mockActivatedRoute.snapshot.paramMap = convertToParamMap({ id: 'm-select' });
    mockMetricService.getMetric.mockReturnValue(
      of({
        statusCode: 200,
        data: { metric: sampleSelectMetric },
      })
    );

    component.ngOnInit();

    expect(component.optionsArray.length).toBe(2);
    expect(component.optionsArray.at(0).value).toBe('ดีมาก');
    expect(component.optionsArray.at(1).value).toBe('ปกติ');
  });

  it('should display error when metric is not found (404)', () => {
    mockMetricService.getMetric.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );

    component.ngOnInit();

    expect(component.loadError()).toBe('ไม่พบข้อมูลตัวชี้วัดนี้ในระบบ');
    expect(component.isLoading()).toBe(false);
  });

  it('should validate required name on submit', () => {
    mockMetricService.getMetric.mockReturnValue(
      of({ statusCode: 200, data: { metric: sampleRatingMetric } })
    );
    component.ngOnInit();

    component.form.patchValue({ name: '   ' });
    component.onSubmit();

    expect(mockMetricService.updateMetric).not.toHaveBeenCalled();
    expect(component.isFieldInvalid('name')).toBe(true);
  });

  it('should validate ratingMin < ratingMax for rating metric', () => {
    mockMetricService.getMetric.mockReturnValue(
      of({ statusCode: 200, data: { metric: sampleRatingMetric } })
    );
    component.ngOnInit();

    component.form.patchValue({ ratingMin: 10, ratingMax: 5 });
    component.onSubmit();

    expect(component.errorMessage()).toBe('คะแนนต่ำสุดต้องน้อยกว่าคะแนนสูงสุด');
    expect(mockMetricService.updateMetric).not.toHaveBeenCalled();
  });

  it('should submit update and navigate to /metrics?edited=true on success', () => {
    mockMetricService.getMetric.mockReturnValue(
      of({ statusCode: 200, data: { metric: sampleRatingMetric } })
    );
    component.ngOnInit();

    component.form.patchValue({ name: 'ความเครียดสะสม' });

    mockMetricService.updateMetric.mockReturnValue(
      of({
        statusCode: 200,
        message: 'Metric updated successfully',
        data: { metric: { ...sampleRatingMetric, name: 'ความเครียดสะสม' } },
      })
    );

    component.onSubmit();

    expect(mockMetricService.updateMetric).toHaveBeenCalledWith('m-rating', {
      name: 'ความเครียดสะสม',
      description: 'ประเมินระดับความเครียดในแต่ละวัน',
      isActive: true,
      ratingMin: 1,
      ratingMax: 5,
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/metrics'], {
      queryParams: { edited: 'true' },
    });
  });

  it('should handle duplicate name error (409)', () => {
    mockMetricService.getMetric.mockReturnValue(
      of({ statusCode: 200, data: { metric: sampleRatingMetric } })
    );
    component.ngOnInit();

    component.form.patchValue({ name: 'มีอยู่แล้ว' });

    mockMetricService.updateMetric.mockReturnValue(
      throwError(() => ({ status: 409 }))
    );

    component.onSubmit();

    expect(component.errorMessage()).toContain('มีตัวชี้วัดชื่อ "มีอยู่แล้ว" อยู่แล้ว');
    expect(component.isSubmitting()).toBe(false);
  });
});
