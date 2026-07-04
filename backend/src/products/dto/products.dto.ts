import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'اسم المنتج مطلوب' })
  name: string;

  // اسم المنتج بالإنجليزي — اختياري، لو اتحدد بيُستخدم بالفاتورة ثنائية اللغة
  @IsOptional()
  @IsString()
  name_en?: string;

  @IsNumber({}, { message: 'السعر يجب أن يكون رقمًا' })
  @IsPositive({ message: 'السعر يجب أن يكون أكبر من صفر' })
  price: number;

  // المخزون الابتدائي اختياري — لو اتحدد، لازم يتحدد معاه الموقع (warehouse_id)
  @IsOptional()
  @IsInt({ message: 'الكمية يجب أن تكون رقمًا صحيحًا' })
  @Min(0, { message: 'الكمية لا يمكن أن تكون سالبة' })
  initial_stock?: number;

  @IsOptional()
  @IsUUID('4', { message: 'معرّف الموقع غير صالح' })
  warehouse_id?: string;
}

// تعديل مخزون منتج في موقع محدد (Absolute set — الرقم النهائي المطلوب، مش فرق)
export class UpdateStockDto {
  @IsUUID('4', { message: 'معرّف الموقع غير صالح' })
  warehouse_id: string;

  @IsInt({ message: 'الكمية يجب أن تكون رقمًا صحيحًا' })
  @Min(0, { message: 'الكمية لا يمكن أن تكون سالبة' })
  quantity: number;
}

// نقل كمية من موقع لموقع تاني لنفس المنتج
export class TransferStockDto {
  @IsUUID('4', { message: 'معرّف موقع المصدر غير صالح' })
  from_warehouse_id: string;

  @IsUUID('4', { message: 'معرّف موقع الوجهة غير صالح' })
  to_warehouse_id: string;

  @IsInt({ message: 'الكمية يجب أن تكون رقمًا صحيحًا' })
  @IsPositive({ message: 'الكمية يجب أن تكون أكبر من صفر' })
  quantity: number;
}

export class ListProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export class BulkImportItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsNumber({}, { message: 'السعر يجب أن يكون رقمًا' })
  @IsPositive()
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  initial_stock?: number;
}

export class BulkImportDto {
  @IsUUID('4', { message: 'لازم تحدد الموقع (warehouse_id) لاستيراد المخزون الابتدائي' })
  warehouse_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkImportItemDto)
  items: BulkImportItemDto[];
}
