import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RecordsComponent } from './records.component';
import { RecordService } from '../../core/services/record.service';
import { MetricService } from '../../core/services/metric.service';
import { MetricRecord } from '../../core/models/record.models';
import { Metric } from '../../core/models/metric.models';

describe('RecordsComponent', () => {
  let injector: Injector;
  let component: RecordsComponent;
  let mockRecordService: {
    getRecords: ReturnType<typeof vi.fn>;
    deleteRecord: ReturnType<typeof vi.fn>;
  };
  let mockMetricService: {
    getMetrics: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      queryParamMap: ReturnType<typeof convertToParamMap>;
    };
  };

  const sampleMetric: Metric = {
    id: 'm-select',
    accountId: 'u1',
    name: 'อารมณ์',
    type: 'SINGLE_SELECT',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [
      { id: 'opt-1', metricId: 'm-select', label: 'สดชื่น', sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'opt-2', metricId: 'm-select', label: 'เหนื่อยล้า', sortOrder: 1, createdAt: '', updatedAt: '' },
    ],
  };

  const sampleRatingMetric: Metric = {
    id: 'm-rating',
    accountId: 'u1',
    name: 'ความเครียด',
    type: 'RATING',
    ratingMin: 1,
    ratingMax: 10,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    options: [],
  };

  const sampleRecord: MetricRecord = {
    id: 'r1',
    metricId: 'm-select',
    value: { optionId: 'opt-1' },
    note: 'หลังกาแฟแก้วแรก',
    recordedAt: '2026-10-03T08:30:00.000Z',
    createdAt: '2026-10-03T08:30:00.000Z',
    updatedAt: '2026-10-03T08:30:00.000Z',
    metric: {
      id: 'm-select',
      name: 'อารมณ์',
      type: 'SINGLE_SELECT',
    },
  };

  beforeEach(() => {
    mockRecordService = {
      getRecords: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: { records: [sampleRecord] },
        })
      ),
      deleteRecord: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          message: 'Record deleted successfully',
        })
      ),
    };

    mockMetricService = {
      getMetrics: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: { metrics: [sampleMetric, sampleRatingMetric] },
        })
      ),
    };

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };

    injector = Injector.create({
      providers: [
        { provide: RecordsComponent },
        { provide: RecordService, useValue: mockRecordService },
        { provide: MetricService, useValue: mockMetricService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    component = injector.get(RecordsComponent);
  });

  it('should load records and metrics lookup map on init', () => {
    component.ngOnInit();

    expect(mockRecordService.getRecords).toHaveBeenCalled();
    expect(mockMetricService.getMetrics).toHaveBeenCalled();
    expect(component.records()).toHaveLength(1);
    expect(component.optionsMap().get('opt-1')).toBe('สดชื่น');
    expect(component.optionsMap().get('opt-2')).toBe('เหนื่อยล้า');
    expect(component.isLoading()).toBe(false);
  });

  it('should handle empty records list', () => {
    mockRecordService.getRecords.mockReturnValue(
      of({ statusCode: 200, data: { records: [] } })
    );

    component.ngOnInit();

    expect(component.records()).toHaveLength(0);
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should set error state when getRecords fails', () => {
    mockRecordService.getRecords.mockReturnValue(
      throwError(() => ({ status: 500 }))
    );

    component.ngOnInit();

    expect(component.records()).toHaveLength(0);
    expect(component.errorMessage()).toBe('ไม่สามารถโหลดข้อมูลการบันทึกได้ กรุณาลองใหม่อีกครั้ง');
    expect(component.isLoading()).toBe(false);
  });

  describe('formatValue', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should format BOOLEAN values properly', () => {
      const boolRecordTrue: MetricRecord = {
        ...sampleRecord,
        value: { value: true },
        metric: { id: 'm-bool', name: 'ออกกำลังกาย', type: 'BOOLEAN' },
      };
      const boolRecordFalse: MetricRecord = {
        ...sampleRecord,
        value: { value: false },
        metric: { id: 'm-bool', name: 'ออกกำลังกาย', type: 'BOOLEAN' },
      };

      expect(component.formatValue(boolRecordTrue)).toBe('✓ ใช่ / ทำแล้ว');
      expect(component.formatValue(boolRecordFalse)).toBe('✗ ไม่ใช่ / ไม่ได้ทำ');
    });

    it('should format NUMBER with unit', () => {
      const numRecord: MetricRecord = {
        ...sampleRecord,
        value: { value: 70.5 },
        metric: { id: 'm-num', name: 'น้ำหนัก', type: 'NUMBER', unit: 'kg' },
      };

      expect(component.formatValue(numRecord)).toBe('70.5 kg');
    });

    it('should format RATING with max range', () => {
      const ratingRecord: MetricRecord = {
        ...sampleRecord,
        metricId: 'm-rating',
        value: { value: 4 },
        metric: { id: 'm-rating', name: 'ความเครียด', type: 'RATING' },
      };

      expect(component.formatValue(ratingRecord)).toBe('4 / 10');
    });

    it('should format SINGLE_SELECT with option label', () => {
      expect(component.formatValue(sampleRecord)).toBe('สดชื่น');
    });

    it('should format MULTIPLE_SELECT with list of option labels', () => {
      const multiRecord: MetricRecord = {
        ...sampleRecord,
        value: { optionIds: ['opt-1', 'opt-2'] },
        metric: { id: 'm-multi', name: 'อาการ', type: 'MULTIPLE_SELECT' },
      };

      expect(component.formatValue(multiRecord)).toBe('สดชื่น, เหนื่อยล้า');
      expect(component.getMultipleSelectLabels(multiRecord)).toEqual(['สดชื่น', 'เหนื่อยล้า']);
    });

    it('should format TEXT value directly', () => {
      const textRecord: MetricRecord = {
        ...sampleRecord,
        value: { value: 'วันนี้รู้สึกแจ่มใส' },
        metric: { id: 'm-text', name: 'บันทึกรายวัน', type: 'TEXT' },
      };

      expect(component.formatValue(textRecord)).toBe('วันนี้รู้สึกแจ่มใส');
    });
  });

  describe('formatThaiDateTime', () => {
    it('should format date with Thai month and Buddhist Era year', () => {
      // 2026-10-03 -> yearBE is 2569, month is ตุลาคม
      const formatted = component.formatThaiDateTime('2026-10-03T13:30:00.000Z');
      expect(formatted).toContain('ตุลาคม');
      expect(formatted).toContain('2569');
      expect(formatted).toContain('น.');
    });
  });

  describe('QueryParams feedback', () => {
    it('should show success message when queryParam created=true', () => {
      mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ created: 'true' });
      component.ngOnInit();

      expect(component.successMessage()).toBe('บันทึกข้อมูลเรียบร้อยแล้ว');
    });

    it('should show success message when queryParam updated=true', () => {
      mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ updated: 'true' });
      component.ngOnInit();

      expect(component.successMessage()).toBe('แก้ไขข้อมูลเรียบร้อยแล้ว');
    });
  });

  describe('onDelete', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should not delete when user cancels confirmation', () => {
      vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(false) });

      component.onDelete(sampleRecord);

      expect(mockRecordService.deleteRecord).not.toHaveBeenCalled();
      expect(component.records()).toHaveLength(1);

      vi.unstubAllGlobals();
    });

    it('should call deleteRecord and remove record from list on confirm', () => {
      vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) });

      component.onDelete(sampleRecord);

      expect(mockRecordService.deleteRecord).toHaveBeenCalledWith('r1');
      expect(component.records()).toHaveLength(0);
      expect(component.successMessage()).toBe('ลบข้อมูลเรียบร้อยแล้ว');
      expect(component.deletingRecordId()).toBeNull();

      vi.unstubAllGlobals();
    });

    it('should handle delete error and keep record in list', () => {
      vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) });
      mockRecordService.deleteRecord.mockReturnValue(
        throwError(() => ({ status: 500 }))
      );

      component.onDelete(sampleRecord);

      expect(component.records()).toHaveLength(1);
      expect(component.errorMessage()).toBe('ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      expect(component.deletingRecordId()).toBeNull();

      vi.unstubAllGlobals();
    });

    it('should prevent double click when deletingRecordId is already set', () => {
      component.deletingRecordId.set('r1');

      component.onDelete(sampleRecord);

      expect(mockRecordService.deleteRecord).not.toHaveBeenCalled();
    });
  });
});
