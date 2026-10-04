import { IsOptional, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRecordDto {
  @IsOptional()
  value?: any;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsString({ message: 'note must be a string' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  note?: string | null;

  @IsOptional()
  @IsString({ message: 'recordedAt must be a valid date string' })
  recordedAt?: string;
}
