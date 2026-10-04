import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MetricsComponent } from './metrics.component';
import { MetricService } from '../../core/services/metric.service';
import { Metric } from '../../core/models/metric.models';

describe('MetricsComponent', () => {
  let injector: Injector;
  let component: MetricsComponent;
  let mockMetricService: {
    getMetrics: ReturnType<typeof vi.fn>;
    deleteMetric: ReturnType<typeof vi.fn>;
    updateMetric: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      queryParamMap: ReturnType<typeof convertToParamMap>;
    };
  };

  const sampleMetric: Metric = {
    id: 'm1',
    accountId: 'u1',
    name: 'ดื่มน้ำ',
    type: 'NUMBER',
    unit: 'แก้ว',
    isActive: true,
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z',
    options: [],
  };

  beforeEach(() => {
    mockMetricService = {
      getMetrics: vi.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: { metrics: [sampleMetric] },
        })
      ),
      deleteMetric: vi.fn(),
      updateMetric: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };

    injector = Injector.create({
      providers: [
        { provide: MetricsComponent },
        { provide: MetricService, useValue: mockMetricService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    component = injector.get(MetricsComponent);
  });

  it('should load metrics on init', () => {
    component.ngOnInit();

    expect(mockMetricService.getMetrics).toHaveBeenCalled();
    expect(component.metrics()).toHaveLength(1);
    expect(component.metrics()[0].name).toBe('ดื่มน้ำ');
    expect(component.isLoading()).toBe(false);
  });

  it('should show success message when queryParam created=true', () => {
    mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ created: 'true' });
    component.ngOnInit();

    expect(component.successMessage()).toBe('สร้างตัวชี้วัดเรียบร้อยแล้ว');
  });

  it('should show success message when queryParam edited=true', () => {
    mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ edited: 'true' });
    component.ngOnInit();

    expect(component.successMessage()).toBe('แก้ไขตัวชี้วัดเรียบร้อยแล้ว');
  });

  it('should toggle active status and update list', () => {
    component.metrics.set([sampleMetric]);

    const updatedMetric: Metric = { ...sampleMetric, isActive: false };
    mockMetricService.updateMetric.mockReturnValue(
      of({
        statusCode: 200,
        message: 'Metric updated successfully',
        data: { metric: updatedMetric },
      })
    );

    component.onToggleActive(sampleMetric);

    expect(mockMetricService.updateMetric).toHaveBeenCalledWith('m1', { isActive: false });
    expect(component.metrics()[0].isActive).toBe(false);
    expect(component.successMessage()).toBe('เปลี่ยนสถานะตัวชี้วัดเรียบร้อยแล้ว');
    expect(component.togglingMetricId()).toBeNull();
  });

  it('should delete metric when confirmed by user', () => {
    vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) });
    component.metrics.set([sampleMetric]);

    mockMetricService.deleteMetric.mockReturnValue(
      of({
        statusCode: 200,
        message: 'Metric deleted successfully',
      })
    );

    component.onDelete(sampleMetric);

    expect(mockMetricService.deleteMetric).toHaveBeenCalledWith('m1');
    expect(component.metrics()).toHaveLength(0);
    expect(component.successMessage()).toBe('ลบตัวชี้วัดเรียบร้อยแล้ว');
    expect(component.deletingMetricId()).toBeNull();
  });

  it('should not delete metric if user cancels confirmation', () => {
    vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(false) });
    component.metrics.set([sampleMetric]);

    component.onDelete(sampleMetric);

    expect(mockMetricService.deleteMetric).not.toHaveBeenCalled();
    expect(component.metrics()).toHaveLength(1);
    expect(component.deletingMetricId()).toBeNull();
  });

  it('should set error message if delete fails', () => {
    vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) });
    component.metrics.set([sampleMetric]);

    mockMetricService.deleteMetric.mockReturnValue(
      throwError(() => ({ status: 500 }))
    );

    component.onDelete(sampleMetric);

    expect(component.metrics()).toHaveLength(1);
    expect(component.errorMessage()).toBe('ไม่สามารถลบตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
    expect(component.deletingMetricId()).toBeNull();
  });
});
