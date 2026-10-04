import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MetricType } from '@prisma/client';

export class MetricOptionDto {
  @IsString({ message: 'Option label must be a string' })
  @IsNotEmpty({ message: 'Option label is required' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  label!: string;

  @IsOptional()
  @IsInt({ message: 'Sort order must be an integer' })
  sortOrder?: number;
}

export class CreateMetricDto {
  @IsString({ message: 'Metric name must be a string' })
  @IsNotEmpty({ message: 'Metric name is required' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsEnum(MetricType, {
    message: `Metric type must be one of: ${Object.values(MetricType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Metric type is required' })
  type!: MetricType;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Group ID must be a valid UUID' })
  groupId?: string;

  @IsOptional()
  @IsString({ message: 'Unit must be a string' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  unit?: string;

  @IsOptional()
  @IsNumber({}, { message: 'ratingMin must be a number' })
  ratingMin?: number;

  @IsOptional()
  @IsNumber({}, { message: 'ratingMax must be a number' })
  ratingMax?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: 'Options must be an array' })
  @ValidateNested({ each: true })
  @Type(() => MetricOptionDto)
  options?: MetricOptionDto[];
}
