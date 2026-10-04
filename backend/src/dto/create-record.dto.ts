import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRecordDto {
  @IsUUID('4', { message: 'metricId must be a valid UUID' })
  @IsNotEmpty({ message: 'metricId is required' })
  metricId!: string;

  @IsNotEmpty({ message: 'value is required' })
  value!: any;

  @IsOptional()
  @IsString({ message: 'note must be a string' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;

  @IsOptional()
  @IsString({ message: 'recordedAt must be a valid date string' })
  recordedAt?: string;
}
