import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateMetricOptionDto {
  @IsString({ message: 'Option label must be a string' })
  @IsNotEmpty({ message: 'Option label is required' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  label!: string;

  @IsOptional()
  @IsInt({ message: 'Sort order must be an integer' })
  sortOrder?: number;
}

export class UpdateMetricDto {
  @IsOptional()
  @IsString({ message: 'Metric name must be a string' })
  @IsNotEmpty({ message: 'Metric name cannot be empty' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsUUID('4', { message: 'Group ID must be a valid UUID' })
  groupId?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsString({ message: 'Unit must be a string' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  unit?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsNumber({}, { message: 'ratingMin must be a number' })
  ratingMin?: number | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsNumber({}, { message: 'ratingMax must be a number' })
  ratingMax?: number | null;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: 'Options must be an array' })
  @ValidateNested({ each: true })
  @Type(() => UpdateMetricOptionDto)
  options?: UpdateMetricOptionDto[];
}
