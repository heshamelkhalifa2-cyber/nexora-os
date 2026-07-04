import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsIn(['ar', 'en'])
  default_language?: string;

  @IsOptional()
  @IsIn(['light', 'dark'])
  default_theme?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  auto_assign_drivers?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  sla_minutes?: number;

  @IsOptional()
  @IsIn([40, 80])
  default_receipt_width?: number;
}
