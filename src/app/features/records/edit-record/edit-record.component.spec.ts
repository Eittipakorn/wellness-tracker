import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { EditRecordComponent } from './edit-record.component';
import { RecordService } from '../../../core/services/record.service';
import { MetricService } from '../../../core/services/metric.service';
import { MetricRecord } from '../../../core/models/record.models';
import { Metric } from '../../../core/models/metric.models';

describe('EditRecordComponent', () => {
  let injector: Injector;
  let component: EditRecordComponent;
  let mockRecordService: {
    getRecord: ReturnType<typeof vi.fn>;
    updateRecord: ReturnType<typeof vi.fn>;
  };
  let mockMetricService: {
    getMetric: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      paramMap: ReturnType<typeof convertToParamMap>;
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
    name: 'บันทึกประจำวัน',
    type: 'TEXT',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const sampleRecord: MetricRecord = {
    id: 'r1',
    metricId: 'm-num',
    value: { value: 68.5 },
    note: 'ก่อนอาหารเช้า',
    recordedAt: '2026-10-04T07:30:00.000Z',
    createdAt: '2026-10-04T07:30:00.000Z',
    updatedAt: '2026-10-04T07:30:00.000Z',
    metric: {
      id: 'm-num',
      name: 'น้ำหนักตัว',
      type: 'NUMBER',
      unit: 'กก.',
    },
  };

  beforeEach(() => {
    mockRecordService = {
      getRecord: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: { record: sampleRecord },
        })
      ),
      updateRecord: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          message: 'Record updated successfully',
          data: { record: sampleRecord },
        })
      ),
    };

    mockMetricService = {
      getMetric: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: { metric: sampleNumMetric },
        })
      ),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: convertToParamMap({ id: 'r1' }),
      },
    };

    injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: EditRecordComponent },
        { provide: RecordService, useValue: mockRecordService },
        { provide: MetricService, useValue: mockMetricService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    component = injector.get(EditRecordComponent);
  });

  it('1. should create component successfully', () => {
    expect(component).toBeTruthy();
    expect(component.form).toBeDefined();
  });

  it('2. should load Record and associated Metric successfully on init', () => {
    component.ngOnInit();

    expect(mockRecordService.getRecord).toHaveBeenCalledWith('r1');
    expect(mockMetricService.getMetric).toHaveBeenCalledWith('m-num');
    expect(component.record()).toEqual(sampleRecord);
    expect(component.metric()).toEqual(sampleNumMetric);
    expect(component.isLoading()).toBe(false);
  });

  it('3. should populate Form with existing Record values', () => {
    component.ngOnInit();

    expect(component.form.value.numberValue).toBe(68.5);
    expect(component.form.value.note).toBe('ก่อนอาหารเช้า');
    expect(component.form.value.recordedAt).toBeTruthy();
  });

  it('4. should populate BOOLEAN metric values correctly', () => {
    const boolRecord: MetricRecord = {
      ...sampleRecord,
      metricId: 'm-bool',
      value: { value: true },
      metric: { id: 'm-bool', name: 'ออกกำลังกาย', type: 'BOOLEAN' },
    };
    mockRecordService.getRecord.mockReturnValue(of({ statusCode: 200, data: { record: boolRecord } }));
    mockMetricService.getMetric.mockReturnValue(of({ statusCode: 200, data: { metric: sampleBoolMetric } }));

    component.ngOnInit();

    expect(component.form.value.booleanValue).toBe(true);

    // Can change to false
    component.form.patchValue({ booleanValue: false });
    expect(component.form.value.booleanValue).toBe(false);
  });

  it('5. should populate NUMBER metric values correctly', () => {
    component.ngOnInit();

    expect(component.form.value.numberValue).toBe(68.5);
    expect(component.metric()?.unit).toBe('กก.');
  });

  it('6. should populate RATING metric values correctly', () => {
    const ratingRecord: MetricRecord = {
      ...sampleRecord,
      metricId: 'm-rating',
      value: { value: 3 },
      metric: { id: 'm-rating', name: 'ระดับความเครียด', type: 'RATING' },
    };
    mockRecordService.getRecord.mockReturnValue(of({ statusCode: 200, data: { record: ratingRecord } }));
    mockMetricService.getMetric.mockReturnValue(of({ statusCode: 200, data: { metric: sampleRatingMetric } }));

    component.ngOnInit();

    expect(component.form.value.ratingValue).toBe(3);
    expect(component.getRatingOptions(sampleRatingMetric)).toEqual([1, 2, 3, 4, 5]);
  });

  it('7. should populate SINGLE_SELECT metric optionId correctly', () => {
    const singleRecord: MetricRecord = {
      ...sampleRecord,
      metricId: 'm-single',
      value: { optionId: 'opt-good' },
      metric: { id: 'm-single', name: 'คุณภาพการนอน', type: 'SINGLE_SELECT' },
    };
    mockRecordService.getRecord.mockReturnValue(of({ statusCode: 200, data: { record: singleRecord } }));
    mockMetricService.getMetric.mockReturnValue(of({ statusCode: 200, data: { metric: sampleSingleMetric } }));

    component.ngOnInit();

    expect(component.form.value.singleSelectValue).toBe('opt-good');
  });

  it('8. should populate MULTIPLE_SELECT metric optionIds correctly and allow toggle', () => {
    const multiRecord: MetricRecord = {
      ...sampleRecord,
      metricId: 'm-multi',
      value: { optionIds: ['opt-headache'] },
      metric: { id: 'm-multi', name: 'อาการประจำวัน', type: 'MULTIPLE_SELECT' },
    };
    mockRecordService.getRecord.mockReturnValue(of({ statusCode: 200, data: { record: multiRecord } }));
    mockMetricService.getMetric.mockReturnValue(of({ statusCode: 200, data: { metric: sampleMultiMetric } }));

    component.ngOnInit();

    expect(component.selectedOptionIds()).toEqual(['opt-headache']);
    expect(component.isOptionSelected('opt-headache')).toBe(true);
    expect(component.isOptionSelected('opt-fatigue')).toBe(false);

    // Toggle add fatigue
    component.toggleOptionId('opt-fatigue');
    expect(component.selectedOptionIds()).toEqual(['opt-headache', 'opt-fatigue']);

    // Toggle remove headache
    component.toggleOptionId('opt-headache');
    expect(component.selectedOptionIds()).toEqual(['opt-fatigue']);
  });

  it('9. should populate TEXT metric values correctly', () => {
    const textRecord: MetricRecord = {
      ...sampleRecord,
      metricId: 'm-text',
      value: { value: 'รู้สึกสดชื่นและมีสมาธิดี' },
      metric: { id: 'm-text', name: 'บันทึกประจำวัน', type: 'TEXT' },
    };
    mockRecordService.getRecord.mockReturnValue(of({ statusCode: 200, data: { record: textRecord } }));
    mockMetricService.getMetric.mockReturnValue(of({ statusCode: 200, data: { metric: sampleTextMetric } }));

    component.ngOnInit();

    expect(component.form.value.textValue).toBe('รู้สึกสดชื่นและมีสมาธิดี');
  });

  it('10. should validate and prevent submit on invalid data', () => {
    component.ngOnInit();

    // 10.1 Empty recordedAt
    component.form.patchValue({ recordedAt: '' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาระบุวันที่และเวลาที่บันทึก');
    expect(mockRecordService.updateRecord).not.toHaveBeenCalled();

    // 10.2 Future recordedAt
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    component.form.patchValue({ recordedAt: component.getLocalDatetimeString(futureDate) });
    component.onSubmit();
    expect(component.errorMessage()).toBe('วันที่และเวลาที่บันทึกต้องไม่เป็นเวลาในอนาคต');
    expect(mockRecordService.updateRecord).not.toHaveBeenCalled();

    // Reset recordedAt
    component.form.patchValue({ recordedAt: component.getLocalDatetimeString() });

    // 10.3 Invalid NUMBER
    component.form.patchValue({ numberValue: null });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาระบุค่าตัวเลขที่ถูกต้อง');

    // 10.4 Out of range RATING
    component.metric.set(sampleRatingMetric);
    component.form.patchValue({ ratingValue: 9 });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาระบุคะแนนระหว่าง 1 ถึง 5');

    // 10.5 Empty SINGLE_SELECT
    component.metric.set(sampleSingleMetric);
    component.form.patchValue({ singleSelectValue: '' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาเลือกตัวเลือก');

    // 10.6 Empty MULTIPLE_SELECT
    component.metric.set(sampleMultiMetric);
    component.selectedOptionIds.set([]);
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณาเลือกอย่างน้อย 1 รายการ');

    // 10.7 Empty TEXT
    component.metric.set(sampleTextMetric);
    component.form.patchValue({ textValue: '   ' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('กรุณากรอกข้อความ');
  });

  it('11. should send correct update payload', () => {
    component.ngOnInit();

    component.form.patchValue({
      numberValue: 69.2,
      note: 'หลังวิ่งเสร็จ',
    });

    component.onSubmit();

    expect(mockRecordService.updateRecord).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({
        value: { value: 69.2 },
        note: 'หลังวิ่งเสร็จ',
      })
    );
  });

  it('12. should navigate to /records with updated=true on submit success', () => {
    component.ngOnInit();
    component.form.patchValue({ numberValue: 70 });

    component.onSubmit();

    expect(component.isSubmitting()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/records'], {
      queryParams: { updated: 'true' },
    });
  });

  it('13. should handle update errors and display Thai error messages', () => {
    component.ngOnInit();
    component.form.patchValue({ numberValue: 70 });

    // 400 error
    mockRecordService.updateRecord.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'ข้อมูลไม่ถูกต้อง' },
      }))
    );
    component.onSubmit();
    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toBe('ข้อมูลไม่ถูกต้อง');

    // 404 error
    mockRecordService.updateRecord.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );
    component.onSubmit();
    expect(component.errorMessage()).toBe('ไม่พบรายการบันทึกนี้ในระบบ');

    // Network error
    mockRecordService.updateRecord.mockReturnValue(
      throwError(() => ({ status: 0 }))
    );
    component.onSubmit();
    expect(component.errorMessage()).toBe('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  });

  it('14. should prevent double submit when isSubmitting is true', () => {
    component.ngOnInit();
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(mockRecordService.updateRecord).not.toHaveBeenCalled();
  });

  it('15. should handle not found record (404) on load', () => {
    mockRecordService.getRecord.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );

    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
    expect(component.isNotFound()).toBe(true);
  });

  it('should handle missing id parameter on init', () => {
    mockActivatedRoute.snapshot.paramMap = convertToParamMap({});

    component.ngOnInit();

    expect(component.isNotFound()).toBe(true);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle general error on loadRecord', () => {
    mockRecordService.getRecord.mockReturnValue(
      throwError(() => ({ status: 500 }))
    );

    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
    expect(component.loadError()).toBe('ไม่สามารถโหลดข้อมูลการบันทึกได้ กรุณาลองใหม่อีกครั้ง');
  });
});
