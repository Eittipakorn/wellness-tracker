import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { Injector } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RecordService } from './record.service';
import { MetricRecord } from '../models/record.models';

describe('RecordService', () => {
  let injector: Injector;
  let service: RecordService;
  let mockHttpClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const sampleRecord: MetricRecord = {
    id: 'r1',
    metricId: 'm1',
    value: { value: 70.5 },
    note: 'หลังตื่นนอน',
    recordedAt: '2026-10-04T08:00:00Z',
    createdAt: '2026-10-04T08:00:00Z',
    updatedAt: '2026-10-04T08:00:00Z',
    metric: {
      id: 'm1',
      name: 'น้ำหนัก',
      type: 'NUMBER',
      unit: 'kg',
    },
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        { provide: RecordService },
        { provide: HttpClient, useValue: mockHttpClient },
      ],
    });

    service = injector.get(RecordService);
  });

  it('should fetch all records without filters', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { records: [sampleRecord] },
      })
    );

    service.getRecords().subscribe((res) => {
      expect(res.data.records).toEqual([sampleRecord]);
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/records',
      expect.objectContaining({ params: expect.any(HttpParams) })
    );
  });

  it('should pass query filters to getRecords', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { records: [sampleRecord] },
      })
    );

    service
      .getRecords({ metricId: 'm1', startDate: '2026-10-01', endDate: '2026-10-04' })
      .subscribe();

    const callArgs = mockHttpClient.get.mock.calls[0];
    const params = callArgs[1].params as HttpParams;
    expect(params.get('metricId')).toBe('m1');
    expect(params.get('startDate')).toBe('2026-10-01');
    expect(params.get('endDate')).toBe('2026-10-04');
  });

  it('should fetch a single record by id', () => {
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { record: sampleRecord },
      })
    );

    service.getRecord('r1').subscribe((res) => {
      expect(res.data.record).toEqual(sampleRecord);
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/records/r1'
    );
  });

  it('should create a record', () => {
    const payload = { metricId: 'm1', value: 70.5 };
    mockHttpClient.post.mockReturnValue(
      of({
        statusCode: 201,
        message: 'Record created successfully',
        data: { record: sampleRecord },
      })
    );

    service.createRecord(payload).subscribe((res) => {
      expect(res.data.record).toEqual(sampleRecord);
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/records',
      payload
    );
  });

  it('should update a record', () => {
    const payload = { value: 71.0 };
    mockHttpClient.put.mockReturnValue(
      of({
        statusCode: 200,
        message: 'Record updated successfully',
        data: { record: { ...sampleRecord, value: { value: 71.0 } } },
      })
    );

    service.updateRecord('r1', payload).subscribe();

    expect(mockHttpClient.put).toHaveBeenCalledWith(
      'http://localhost:3000/api/records/r1',
      payload
    );
  });

  it('should delete a record', () => {
    mockHttpClient.delete.mockReturnValue(
      of({
        statusCode: 200,
        message: 'Record deleted successfully',
        data: { success: true },
      })
    );

    service.deleteRecord('r1').subscribe();

    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      'http://localhost:3000/api/records/r1'
    );
  });
});
