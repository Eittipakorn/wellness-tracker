import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CreateRecordComponent } from './create-record.component';
import { RecordService } from '../../../core/services/record.service';
import { MetricService } from '../../../core/services/metric.service';
import { Metric } from '../../../core/models/metric.models';

describe('CreateRecordComponent', () => {
  let injector: Injector;
  let component: CreateRecordComponent;
  let mockRecordService: {
    createRecord: ReturnType<typeof vi.fn>;
  };
  let mockMetricService: {
    getMetrics: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      queryParamMap: ReturnType<typeof convertToParamMap>;
    };
  };

  const sampleBoolMetric: Metric = {
    id: 'm-bool',
    accountId: 'u1',
    name: 'ออกกำลังกาย',
    type: 'BOOLEAN',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const sampleNumMetric: Metric = {
    id: 'm-num',
    accountId: 'u1',
    name: 'น้ำหนักตัว',
    type: 'NUMBER',
    unit: 'กก.',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const sampleRatingMetric: Metric = {
    id: 'm-rating',
    accountId: 'u1',
    name: 'ระดับความเครียด',
    type: 'RATING',
    ratingMin: 1,
    ratingMax: 5,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const sampleSingleMetric: Metric = {
    id: 'm-single',
    accountId: 'u1',
    name: 'คุณภาพการนอน',
    type: 'SINGLE_SELECT',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [
      { id: 'opt-good', metricId: 'm-single', label: 'หลับสนิท', sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'opt-poor', metricId: 'm-single', label: 'หลับไม่สนิท', sortOrder: 1, createdAt: '', updatedAt: '' },
    ],
  };

  const sampleMultiMetric: Metric = {
    id: 'm-multi',
    accountId: 'u1',
    name: 'อาการประจำวัน',
    type: 'MULTIPLE_SELECT',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [
      { id: 'opt-headache', metricId: 'm-multi', label: 'ปวดศีรษะ', sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'opt-fatigue', metricId: 'm-multi', label: 'อ่อนเพลีย', sortOrder: 1, createdAt: '', updatedAt: '' },
    ],
  };

  const sampleTextMetric: Metric = {
    id: 'm-text',
    accountId: 'u1',
    name: 'บันทึกความรู้สึก',
    type: 'TEXT',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const sampleInactiveMetric: Metric = {
    id: 'm-inactive',
    accountId: 'u1',
    name: 'ตัวชี้วัดที่ปิดใช้งาน',
    type: 'NUMBER',
    isActive: false,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const allSampleMetrics: Metric[] = [
    sampleBoolMetric,
    sampleNumMetric,
    sampleRatingMetric,
    sampleSingleMetric,
    sampleMultiMetric,
    sampleTextMetric,
    sampleInactiveMetric,
  ];

  beforeEach(() => {
    mockRecordService = {
      createRecord: vi.fn().mockReturnValue(
        of({
          statusCode: 201,
          message: 'Record created successfully',
          data: { record: {} as any },
        })
      ),
    };

    mockMetricService = {
      getMetrics: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: { metrics: allSampleMetrics },
        })
      ),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };

    injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: CreateRecordComponent },
        { provide: RecordService, useValue: mockRecordService },
        { provide: MetricService, useValue: mockMetricService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    component = injector.get(CreateRecordComponent);
  });

  it('1. should create component successfully', () => {
    expect(component).toBeTruthy();
    expect(component.form).toBeDefined();
    expect(component.form.get('recordedAt')?.value).toBeTruthy();
  });

  it('2. should load active metrics successfully and preselect first active metric', () => {
    component.ngOnInit();

    expect(mockMetricService.getMetrics).toHaveBeenCalled();
    expect(component.isLoadingMetrics()).toBe(false);
    expect(component.activeMetrics().length).toBe(6);
    expect(component.selectedMetric()?.id).toBe(sampleBoolMetric.id);
  });

  it('3. should display only active metrics and filter out inactive ones', () => {
    component.ngOnInit();

    const activeIds = component.activeMetrics().map((m) => m.id);
    expect(activeIds).not.toContain('m-inactive');
    expect(activeIds).toEqual([
      'm-bool',
      'm-num',
      'm-rating',
      'm-single',
      'm-multi',
      'm-text',
    ]);
  });

  it('4. should show empty state when there are no active metrics', () => {
    mockMetricService.getMetrics.mockReturnValue(
      of({
        statusCode: 200,
        data: { metrics: [sampleInactiveMetric] },
      })
    );

    component.ngOnInit();

    expect(component.activeMetrics().length).toBe(0);
    expect(component.selectedMetric()).toBeNull();
  });

  it('should preselect metric from queryParam if provided and active', () => {
    mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ metricId: 'm-rating' });
    component.ngOnInit();

    expect(component.selectedMetric()?.id).toBe('m-rating');
    expect(component.form.value.metricId).toBe('m-rating');
  });

  it('should handle load error when getMetrics fails', () => {
    mockMetricService.getMetrics.mockReturnValue(
      throwError(() => new Error('Network error'))
    );

    component.ngOnInit();

    expect(component.isLoadingMetrics()).toBe(false);
    expect(component.loadError()).toBe('ไม่สามารถโหลดรายการตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
  });

  it('5. should construct correct payload for BOOLEAN metric', () => {
    component.ngOnInit();
    component.selectMetric(sampleBoolMetric);

    // Test true
    component.form.patchValue({ booleanValue: true });
    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-bool',
        value: { value: true },
      })
    );

    // Test false
    component.form.patchValue({ booleanValue: false });
    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-bool',
        value: { value: false },
      })
    );
  });

  it('6. should construct correct payload for NUMBER metric', () => {
    component.ngOnInit();
    component.selectMetric(sampleNumMetric);

    component.form.patchValue({ numberValue: 65.5 });
    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-num',
        value: { value: 65.5 },
      })
    );
  });

  it('7. should construct correct payload for RATING metric', () => {
    component.ngOnInit();
    component.selectMetric(sampleRatingMetric);

    component.form.patchValue({ ratingValue: 4 });
    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-rating',
        value: { value: 4 },
      })
    );
  });

  it('8. should construct correct payload for SINGLE_SELECT metric', () => {
    component.ngOnInit();
    component.selectMetric(sampleSingleMetric);

    component.form.patchValue({ singleSelectValue: 'opt-good' });
    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-single',
        value: { optionId: 'opt-good' },
      })
    );
  });

  it('9. should construct correct payload for MULTIPLE_SELECT metric', () => {
    component.ngOnInit();
    component.selectMetric(sampleMultiMetric);

    component.toggleOptionId('opt-headache');
    component.toggleOptionId('opt-fatigue');
    expect(component.isOptionSelected('opt-headache')).toBe(true);

    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-multi',
        value: { optionIds: ['opt-headache', 'opt-fatigue'] },
      })
    );
  });

  it('10. should construct correct payload for TEXT metric', () => {
    component.ngOnInit();
    component.selectMetric(sampleTextMetric);

    component.form.patchValue({ textValue: 'วันนี้รู้สึกมีพลังและทำงานได้ดี' });
    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-text',
        value: { value: 'วันนี้รู้สึกมีพลังและทำงานได้ดี' },
      })
    );
  });

  it('11. should validate and prevent submit when required data is missing or invalid', () => {
    component.ngOnInit();

    // 11.1 No metric selected
    component.selectedMetric.set(null);
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาเลือกรายการติดตาม');
    expect(mockRecordService.createRecord).not.toHaveBeenCalled();

    // 11.2 Invalid/Empty recordedAt
    component.selectMetric(sampleBoolMetric);
    component.form.patchValue({ recordedAt: '' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาระบุวันที่และเวลาที่บันทึก');
    expect(mockRecordService.createRecord).not.toHaveBeenCalled();

    // 11.3 Future recordedAt (more than 1 minute in future)
    const futureDate = new Date(Date.now() + 5 * 60 * 1000);
    component.form.patchValue({ recordedAt: component.getLocalDatetimeString(futureDate) });
    component.onSubmit();
    expect(component.errorMessage()).toBe('วันที่และเวลาที่บันทึกต้องไม่เป็นเวลาในอนาคต');
    expect(mockRecordService.createRecord).not.toHaveBeenCalled();

    // Reset recordedAt to valid now
    component.form.patchValue({ recordedAt: component.getLocalDatetimeString() });

    // 11.4 Empty NUMBER
    component.selectMetric(sampleNumMetric);
    component.form.patchValue({ numberValue: null });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาระบุค่าตัวเลขที่ถูกต้อง');

    // 11.5 RATING outside range
    component.selectMetric(sampleRatingMetric);
    component.form.patchValue({ ratingValue: 6 });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาระบุคะแนนระหว่าง 1 ถึง 5');

    // 11.6 Empty SINGLE_SELECT
    component.selectMetric(sampleSingleMetric);
    component.form.patchValue({ singleSelectValue: '' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาเลือกตัวเลือก');

    // 11.7 Empty MULTIPLE_SELECT
    component.selectMetric(sampleMultiMetric);
    component.selectedOptionIds.set([]);
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาเลือกอย่างน้อย 1 รายการ');

    // 11.8 Empty TEXT
    component.selectMetric(sampleTextMetric);
    component.form.patchValue({ textValue: '   ' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณากรอกข้อความ');
  });

  it('12. should submit successfully and navigate back to /records with created=true', () => {
    component.ngOnInit();
    component.selectMetric(sampleNumMetric);
    component.form.patchValue({ numberValue: 70, note: 'ชั่งตอนเช้า' });

    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-num',
        value: { value: 70 },
        note: 'ชั่งตอนเช้า',
      })
    );
    expect(component.isSubmitting()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/records'], {
      queryParams: { created: 'true' },
    });
  });

  it('should omit empty note from payload', () => {
    component.ngOnInit();
    component.selectMetric(sampleNumMetric);
    component.form.patchValue({ numberValue: 70, note: '   ' });

    component.onSubmit();

    expect(mockRecordService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: 'm-num',
        value: { value: 70 },
        note: undefined,
      })
    );
  });

  it('13. should handle submit error and display Thai error message', () => {
    component.ngOnInit();
    component.selectMetric(sampleNumMetric);
    component.form.patchValue({ numberValue: 70 });

    mockRecordService.createRecord.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: ['ค่าตัวเลขต้องไม่ติดลบ'] },
      }))
    );

    component.onSubmit();

    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toBe('ค่าตัวเลขต้องไม่ติดลบ');
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // 404 error
    mockRecordService.createRecord.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );
    component.onSubmit();
    expect(component.errorMessage()).toBe('ไม่พบรายการตัวชี้วัดนี้ในระบบ');

    // Connection error (status 0)
    mockRecordService.createRecord.mockReturnValue(
      throwError(() => ({ status: 0 }))
    );
    component.onSubmit();
    expect(component.errorMessage()).toBe('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  });

  it('14. should prevent double submission when isSubmitting is true', () => {
    component.ngOnInit();
    component.selectMetric(sampleNumMetric);
    component.form.patchValue({ numberValue: 70 });

    component.isSubmitting.set(true);
    component.onSubmit();

    expect(mockRecordService.createRecord).not.toHaveBeenCalled();
  });

  it('should helper methods work properly', () => {
    component.ngOnInit();

    expect(component.getMetricTypeLabel('BOOLEAN')).toBe('เช็ก / ไม่เช็ก');
    expect(component.getMetricTypeLabel('NUMBER')).toBe('ตัวเลข');
    expect(component.getMetricTypeLabel('RATING')).toBe('คะแนน');
    expect(component.getMetricTypeLabel('SINGLE_SELECT')).toBe('เลือกหนึ่งรายการ');
    expect(component.getMetricTypeLabel('MULTIPLE_SELECT')).toBe('เลือกได้หลายรายการ');
    expect(component.getMetricTypeLabel('TEXT')).toBe('ข้อความ');

    expect(component.getTypeBadgeClass('BOOLEAN')).toBe('badge-boolean');
    expect(component.getTypeBadgeClass('NUMBER')).toBe('badge-number');

    expect(component.getRatingOptions(sampleRatingMetric)).toEqual([1, 2, 3, 4, 5]);

    // toggle option ID back and forth
    component.toggleOptionId('opt-1');
    expect(component.isOptionSelected('opt-1')).toBe(true);
    component.toggleOptionId('opt-1');
    expect(component.isOptionSelected('opt-1')).toBe(false);

    // onMetricChange
    component.onMetricChange('m-text');
    expect(component.selectedMetric()?.id).toBe('m-text');

    component.onMetricChange('non-existent');
    expect(component.selectedMetric()).toBeNull();
  });
});
