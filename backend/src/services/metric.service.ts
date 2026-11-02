import { MetricType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateMetricDto } from '../dto/create-metric.dto';
import { UpdateMetricDto } from '../dto/update-metric.dto';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors';

export class MetricService {
  async getUserMetrics(userId: string) {
    return prisma.metric.findMany({
      where: { accountId: userId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMetricById(metricId: string, userId: string) {
    const metric = await prisma.metric.findFirst({
      where: {
        id: metricId,
        accountId: userId,
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!metric) {
      throw new NotFoundError('Metric not found');
    }

    return metric;
  }

  async createMetric(userId: string, dto: CreateMetricDto) {
    // 1. Verify metric name uniqueness for the user
    const existingName = await prisma.metric.findUnique({
      where: {
        accountId_name: {
          accountId: userId,
          name: dto.name,
        },
      },
    });

    if (existingName) {
      throw new ConflictError(`A metric with name "${dto.name}" already exists`);
    }

    // 2. Validate group ownership if provided
    if (dto.groupId) {
      const group = await prisma.group.findFirst({
        where: {
          id: dto.groupId,
          accountId: userId,
        },
      });

      if (!group) {
        throw new BadRequestError('Group not found or does not belong to you');
      }
    }

    // 3. Validate type-specific constraints
    if (dto.type === MetricType.RATING) {
      if (dto.ratingMin !== undefined && dto.ratingMax !== undefined) {
        if (dto.ratingMin >= dto.ratingMax) {
          throw new BadRequestError('ratingMin must be strictly less than ratingMax');
        }
      } else if (dto.ratingMin !== undefined || dto.ratingMax !== undefined) {
        throw new BadRequestError('Both ratingMin and ratingMax must be provided for RATING metrics');
      }
    }

    if (dto.type === MetricType.SINGLE_SELECT || dto.type === MetricType.MULTIPLE_SELECT) {
      if (dto.options && dto.options.length > 0) {
        const labels = dto.options.map((opt) => opt.label.trim().toLowerCase());
        const uniqueLabels = new Set(labels);
        if (uniqueLabels.size !== labels.length) {
          throw new BadRequestError('Metric option labels must be unique');
        }
      }
    } else if (dto.options && dto.options.length > 0) {
      throw new BadRequestError('Options are only allowed for SINGLE_SELECT and MULTIPLE_SELECT metrics');
    }

    // 4. Create metric with nested options if select type
    const isSelectType = dto.type === MetricType.SINGLE_SELECT || dto.type === MetricType.MULTIPLE_SELECT;
    const hasOptions = isSelectType && dto.options && dto.options.length > 0;

    const metric = await prisma.metric.create({
      data: {
        accountId: userId,
        name: dto.name,
        description: dto.description || null,
        type: dto.type,
        groupId: dto.groupId || null,
        unit: dto.type === MetricType.NUMBER ? dto.unit || null : null,
        ratingMin: dto.type === MetricType.RATING ? dto.ratingMin ?? null : null,
        ratingMax: dto.type === MetricType.RATING ? dto.ratingMax ?? null : null,
        isActive: dto.isActive ?? true,
        options: hasOptions
          ? {
              create: dto.options!.map((opt, idx) => ({
                label: opt.label,
                sortOrder: opt.sortOrder ?? idx,
              })),
            }
          : undefined,
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return metric;
  }

  async updateMetric(metricId: string, userId: string, dto: UpdateMetricDto) {
    // 1. Verify metric exists and belongs to the user
    const existing = await prisma.metric.findFirst({
      where: {
        id: metricId,
        accountId: userId,
      },
      include: {
        options: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Metric not found');
    }

    // 2. Validate name uniqueness if being updated
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await prisma.metric.findUnique({
        where: {
          accountId_name: {
            accountId: userId,
            name: dto.name,
          },
        },
      });

      if (duplicate) {
        throw new ConflictError(`A metric with name "${dto.name}" already exists`);
      }
    }

    // 3. Validate group ownership if groupId provided
    if (dto.groupId) {
      const group = await prisma.group.findFirst({
        where: {
          id: dto.groupId,
          accountId: userId,
        },
      });

      if (!group) {
        throw new BadRequestError('Group not found or does not belong to you');
      }
    }

    // 4. Validate rating constraints if updated
    if (existing.type === MetricType.RATING) {
      const min = dto.ratingMin !== undefined ? dto.ratingMin : existing.ratingMin;
      const max = dto.ratingMax !== undefined ? dto.ratingMax : existing.ratingMax;

      if (min !== null && max !== null && min !== undefined && max !== undefined && min >= max) {
        throw new BadRequestError('ratingMin must be strictly less than ratingMax');
      }
    }

    // 5. Validate options if updated
    const isSelectType =
      existing.type === MetricType.SINGLE_SELECT || existing.type === MetricType.MULTIPLE_SELECT;

    if (dto.options !== undefined) {
      if (!isSelectType) {
        throw new BadRequestError('Options can only be configured for SINGLE_SELECT and MULTIPLE_SELECT metrics');
      }

      const labels = dto.options.map((opt) => opt.label.trim().toLowerCase());
      const uniqueLabels = new Set(labels);
      if (uniqueLabels.size !== labels.length) {
        throw new BadRequestError('Metric option labels must be unique');
      }

      const existingOptionIds = new Set(existing.options.map((o) => o.id));
      const providedIds = dto.options
        .map((o) => o.id)
        .filter((id): id is string => Boolean(id));

      if (new Set(providedIds).size !== providedIds.length) {
        throw new BadRequestError('Duplicate option IDs provided');
      }

      for (const id of providedIds) {
        if (!existingOptionIds.has(id)) {
          throw new BadRequestError(`Option with ID ${id} does not belong to this metric`);
        }
      }
    }

    // 6. Execute update (in transaction if options need updating)
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (dto.options !== undefined && isSelectType) {
        const existingOptions = existing.options;
        const matchedExistingIds = new Set<string>();

        type ResolvedOption = {
          existingId?: string;
          label: string;
          sortOrder: number;
        };

        const resolvedOptions: ResolvedOption[] = [];

        for (let idx = 0; idx < dto.options.length; idx++) {
          const opt = dto.options[idx];
          const sortOrder = opt.sortOrder ?? idx;
          if (opt.id && existingOptions.some((eo) => eo.id === opt.id)) {
            matchedExistingIds.add(opt.id);
            resolvedOptions.push({
              existingId: opt.id,
              label: opt.label,
              sortOrder,
            });
          } else {
            resolvedOptions.push({
              label: opt.label,
              sortOrder,
            });
          }
        }

        for (const item of resolvedOptions) {
          if (!item.existingId) {
            const matchByLabel = existingOptions.find(
              (eo) =>
                !matchedExistingIds.has(eo.id) &&
                eo.label.trim().toLowerCase() === item.label.trim().toLowerCase()
            );
            if (matchByLabel) {
              item.existingId = matchByLabel.id;
              matchedExistingIds.add(matchByLabel.id);
            }
          }
        }

        const toDeleteIds = existingOptions
          .filter((eo) => !matchedExistingIds.has(eo.id))
          .map((eo) => eo.id);

        if (toDeleteIds.length > 0) {
          await tx.metricOption.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        for (const item of resolvedOptions) {
          if (item.existingId) {
            await tx.metricOption.update({
              where: { id: item.existingId },
              data: {
                label: item.label,
                sortOrder: item.sortOrder,
              },
            });
          } else {
            await tx.metricOption.create({
              data: {
                metricId,
                label: item.label,
                sortOrder: item.sortOrder,
              },
            });
          }
        }
      }

      return tx.metric.update({
        where: { id: metricId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.groupId !== undefined && { groupId: dto.groupId }),
          ...(dto.unit !== undefined && existing.type === MetricType.NUMBER && { unit: dto.unit }),
          ...(dto.ratingMin !== undefined && existing.type === MetricType.RATING && { ratingMin: dto.ratingMin }),
          ...(dto.ratingMax !== undefined && existing.type === MetricType.RATING && { ratingMax: dto.ratingMax }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        include: {
          options: {
            orderBy: { sortOrder: 'asc' },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });
  }

  async deleteMetric(metricId: string, userId: string) {
    const existing = await prisma.metric.findFirst({
      where: {
        id: metricId,
        accountId: userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Metric not found');
    }

    await prisma.metric.delete({
      where: { id: metricId },
    });

    return { success: true };
  }
}

export const metricService = new MetricService();
