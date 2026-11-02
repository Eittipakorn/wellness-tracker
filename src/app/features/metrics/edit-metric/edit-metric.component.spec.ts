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

  describe('Regression: Multiple Select Options Preservation & Cancel', () => {
    const sampleMultiSelectMetric: Metric = {
      id: 'm-multi-test',
      accountId: 'u1',
      name: 'ช่วงเวลาทำสมาธิ',
      type: 'MULTIPLE_SELECT',
      description: 'ช่วงเวลาที่ทำสมาธิในแต่ละวัน',
      isActive: true,
      createdAt: '2026-10-04T00:00:00Z',
      updatedAt: '2026-10-04T00:00:00Z',
      options: [
        { id: 'opt-morning', metricId: 'm-multi-test', label: 'เช้า', sortOrder: 0, createdAt: '', updatedAt: '' },
        { id: 'opt-evening', metricId: 'm-multi-test', label: 'เย็น', sortOrder: 1, createdAt: '', updatedAt: '' },
      ],
    };

    it('Case A & E: should not call updateMetric when editing options but user cancels or navigates away', () => {
      mockActivatedRoute.snapshot.paramMap = convertToParamMap({ id: 'm-multi-test' });
      mockMetricService.getMetric.mockReturnValue(
        of({ statusCode: 200, data: { metric: sampleMultiSelectMetric } })
      );
      component.ngOnInit();

      // User modifies option label and adds a new option in the form
      component.optionsArray.at(0).setValue('เช้าตรู่');
      component.addOption();
      component.optionsArray.at(2).setValue('ค่ำ');

      // User does NOT submit form (e.g. clicks Cancel / navigates away)
      // Form state is dirty/changed in memory only
      expect(component.optionsArray.length).toBe(3);
      expect(mockMetricService.updateMetric).not.toHaveBeenCalled();
    });

    it('Case D: should preserve existing option IDs in payload when saving edited select metric', () => {
      mockActivatedRoute.snapshot.paramMap = convertToParamMap({ id: 'm-multi-test' });
      mockMetricService.getMetric.mockReturnValue(
        of({ statusCode: 200, data: { metric: sampleMultiSelectMetric } })
      );
      component.ngOnInit();

      // Rename first option from 'เช้า' to 'เช้าตรู่', leave 2nd as 'เย็น', add 3rd 'ค่ำ'
      component.optionsArray.at(0).setValue('เช้าตรู่');
      component.addOption();
      component.optionsArray.at(2).setValue('ค่ำ');

      mockMetricService.updateMetric.mockReturnValue(
        of({
          statusCode: 200,
          message: 'Updated',
          data: { metric: sampleMultiSelectMetric },
        })
      );

      component.onSubmit();

      expect(mockMetricService.updateMetric).toHaveBeenCalledWith('m-multi-test', {
        name: 'ช่วงเวลาทำสมาธิ',
        description: 'ช่วงเวลาที่ทำสมาธิในแต่ละวัน',
        isActive: true,
        options: [
          { id: 'opt-morning', label: 'เช้าตรู่', sortOrder: 0 },
          { id: 'opt-evening', label: 'เย็น', sortOrder: 1 },
          { label: 'ค่ำ', sortOrder: 2 },
        ],
      });
    });

    it('Case D (Remove): should correctly remove option and maintain remaining option IDs', () => {
      mockActivatedRoute.snapshot.paramMap = convertToParamMap({ id: 'm-multi-test' });
      mockMetricService.getMetric.mockReturnValue(
        of({
          statusCode: 200,
          data: {
            metric: {
              ...sampleMultiSelectMetric,
              options: [
                { id: 'opt-1', metricId: 'm-multi-test', label: 'เช้า', sortOrder: 0, createdAt: '', updatedAt: '' },
                { id: 'opt-2', metricId: 'm-multi-test', label: 'สาย', sortOrder: 1, createdAt: '', updatedAt: '' },
                { id: 'opt-3', metricId: 'm-multi-test', label: 'เย็น', sortOrder: 2, createdAt: '', updatedAt: '' },
              ],
            },
          },
        })
      );
      component.ngOnInit();

      expect(component.optionsArray.length).toBe(3);

      // Remove middle option (opt-2: 'สาย')
      component.removeOption(1);

      expect(component.optionsArray.length).toBe(2);

      mockMetricService.updateMetric.mockReturnValue(
        of({ statusCode: 200, data: { metric: sampleMultiSelectMetric } })
      );

      component.onSubmit();

      expect(mockMetricService.updateMetric).toHaveBeenCalledWith('m-multi-test', {
        name: 'ช่วงเวลาทำสมาธิ',
        description: 'ช่วงเวลาที่ทำสมาธิในแต่ละวัน',
        isActive: true,
        options: [
          { id: 'opt-1', label: 'เช้า', sortOrder: 0 },
          { id: 'opt-3', label: 'เย็น', sortOrder: 1 },
        ],
      });
    });
  });
});
