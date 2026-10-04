import { MetricType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateRecordDto } from '../dto/create-record.dto';
import { UpdateRecordDto } from '../dto/update-record.dto';
import { BadRequestError, NotFoundError } from '../lib/errors';

export interface RecordFilters {
  metricId?: string;
  startDate?: string;
  endDate?: string;
}

export class RecordService {
  async getUserRecords(userId: string, filters: RecordFilters = {}) {
    const where: Prisma.MetricRecordWhereInput = {
      metric: {
        accountId: userId,
      },
    };

    if (filters.metricId) {
      where.metricId = filters.metricId;
    }

    if (filters.startDate || filters.endDate) {
      where.recordedAt = {};

      if (filters.startDate) {
        const start = new Date(filters.startDate);
        if (isNaN(start.getTime())) {
          throw new BadRequestError('Invalid startDate format');
        }
        where.recordedAt.gte = start;
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate);
        if (isNaN(end.getTime())) {
          throw new BadRequestError('Invalid endDate format');
        }
        where.recordedAt.lte = end;
      }
    }

    return prisma.metricRecord.findMany({
      where,
      include: {
        metric: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getRecordById(recordId: string, userId: string) {
    const record = await prisma.metricRecord.findFirst({
      where: {
        id: recordId,
        metric: {
          accountId: userId,
        },
      },
      include: {
        metric: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    return record;
  }

  async createRecord(userId: string, dto: CreateRecordDto) {
    // 1. Verify metric exists and belongs to the authenticated user
    const metric = await prisma.metric.findFirst({
      where: {
        id: dto.metricId,
        accountId: userId,
      },
      include: {
        options: true,
      },
    });

    if (!metric) {
      throw new NotFoundError('Metric not found');
    }

    // 2. Validate and format value according to Metric type
    const formattedValue = this.validateAndFormatValue(metric.type, dto.value, metric);

    // 3. Validate recordedAt date
    let recordDate = new Date();
    if (dto.recordedAt) {
      recordDate = new Date(dto.recordedAt);
      if (isNaN(recordDate.getTime())) {
        throw new BadRequestError('Invalid date format for recordedAt');
      }
    }

    // FR-05.03: Cannot record in the future (with 1-minute tolerance for clock differences)
    const maxFuture = new Date(Date.now() + 60000);
    if (recordDate > maxFuture) {
      throw new BadRequestError('recordedAt cannot be in the future');
    }

    // 4. Save record
    return prisma.metricRecord.create({
      data: {
        metricId: metric.id,
        value: formattedValue,
        note: dto.note || null,
        recordedAt: recordDate,
      },
      include: {
        metric: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
    });
  }

  async updateRecord(recordId: string, userId: string, dto: UpdateRecordDto) {
    // 1. Verify record exists and belongs to the authenticated user
    const existing = await prisma.metricRecord.findFirst({
      where: {
        id: recordId,
        metric: {
          accountId: userId,
        },
      },
      include: {
        metric: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Record not found');
    }

    // 2. Validate value if updated
    let formattedValue: Prisma.InputJsonValue | undefined;
    if (dto.value !== undefined) {
      formattedValue = this.validateAndFormatValue(
        existing.metric.type,
        dto.value,
        existing.metric
      );
    }

    // 3. Validate recordedAt if updated
    let recordDate: Date | undefined;
    if (dto.recordedAt !== undefined) {
      recordDate = new Date(dto.recordedAt);
      if (isNaN(recordDate.getTime())) {
        throw new BadRequestError('Invalid date format for recordedAt');
      }
      const maxFuture = new Date(Date.now() + 60000);
      if (recordDate > maxFuture) {
        throw new BadRequestError('recordedAt cannot be in the future');
      }
    }

    // 4. Update record
    return prisma.metricRecord.update({
      where: { id: recordId },
      data: {
        ...(formattedValue !== undefined && { value: formattedValue }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(recordDate !== undefined && { recordedAt: recordDate }),
      },
      include: {
        metric: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
          },
        },
      },
    });
  }

  async deleteRecord(recordId: string, userId: string) {
    const existing = await prisma.metricRecord.findFirst({
      where: {
        id: recordId,
        metric: {
          accountId: userId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Record not found');
    }

    await prisma.metricRecord.delete({
      where: { id: recordId },
    });

    return { success: true };
  }

  private validateAndFormatValue(
    type: MetricType,
    value: any,
    metric: {
      ratingMin: number | null;
      ratingMax: number | null;
      options: { id: string }[];
    }
  ): Prisma.InputJsonValue {
    if (value === undefined || value === null) {
      throw new BadRequestError('Record value cannot be empty');
    }

    switch (type) {
      case MetricType.BOOLEAN: {
        const rawVal =
          typeof value === 'object' && value !== null && 'value' in value
            ? value.value
            : value;
        if (typeof rawVal !== 'boolean') {
          throw new BadRequestError('Value for BOOLEAN metric must be a boolean');
        }
        return { value: rawVal };
      }

      case MetricType.NUMBER: {
        const rawVal =
          typeof value === 'object' && value !== null && 'value' in value
            ? value.value
            : value;
        if (typeof rawVal !== 'number' || isNaN(rawVal) || !isFinite(rawVal)) {
          throw new BadRequestError('Value for NUMBER metric must be a valid number');
        }
        return { value: rawVal };
      }

      case MetricType.RATING: {
        const rawVal =
          typeof value === 'object' && value !== null && 'value' in value
            ? value.value
            : value;
        if (typeof rawVal !== 'number' || isNaN(rawVal) || !isFinite(rawVal)) {
          throw new BadRequestError('Value for RATING metric must be a valid number');
        }
        if (metric.ratingMin !== null && rawVal < metric.ratingMin) {
          throw new BadRequestError(
            `Rating value cannot be less than configured minimum (${metric.ratingMin})`
          );
        }
        if (metric.ratingMax !== null && rawVal > metric.ratingMax) {
          throw new BadRequestError(
            `Rating value cannot exceed configured maximum (${metric.ratingMax})`
          );
        }
        return { value: rawVal };
      }

      case MetricType.SINGLE_SELECT: {
        let optionId: string;
        if (typeof value === 'object' && value !== null && 'optionId' in value) {
          optionId = value.optionId;
        } else if (typeof value === 'string') {
          optionId = value;
        } else {
          throw new BadRequestError(
            'Value for SINGLE_SELECT must be { optionId: "UUID" } or an option UUID'
          );
        }

        if (typeof optionId !== 'string' || !optionId.trim()) {
          throw new BadRequestError('optionId is required for SINGLE_SELECT');
        }

        const valid = metric.options.some((opt) => opt.id === optionId);
        if (!valid) {
          throw new BadRequestError(
            `Option with ID "${optionId}" does not belong to this metric`
          );
        }
        return { optionId };
      }

      case MetricType.MULTIPLE_SELECT: {
        let optionIds: string[];
        if (
          typeof value === 'object' &&
          value !== null &&
          Array.isArray(value.optionIds)
        ) {
          optionIds = value.optionIds;
        } else if (Array.isArray(value)) {
          optionIds = value;
        } else {
          throw new BadRequestError(
            'Value for MULTIPLE_SELECT must be { optionIds: ["UUID"] } or an array of option UUIDs'
          );
        }

        const validOptionIds = new Set(metric.options.map((opt) => opt.id));
        for (const id of optionIds) {
          if (typeof id !== 'string' || !validOptionIds.has(id)) {
            throw new BadRequestError(
              `Option with ID "${id}" does not belong to this metric`
            );
          }
        }
        return { optionIds };
      }

      case MetricType.TEXT: {
        const rawVal =
          typeof value === 'object' && value !== null && 'value' in value
            ? value.value
            : value;
        if (typeof rawVal !== 'string') {
          throw new BadRequestError('Value for TEXT metric must be a string');
        }
        return { value: rawVal };
      }

      default:
        throw new BadRequestError(`Unsupported metric type: ${type}`);
    }
  }
}

export const recordService = new RecordService();
