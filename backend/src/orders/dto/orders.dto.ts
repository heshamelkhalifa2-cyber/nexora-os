import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID('4', { message: 'معرّف المنتج غير صالح' })
  product_id: string;

  @IsInt({ message: 'الكمية يجب أن تكون رقمًا صحيحًا' })
  @IsPositive({ message: 'الكمية يجب أن تكون أكبر من صفر' })
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(1, { message: 'اسم العميل مطلوب' })
  customer_name: string;

  @IsOptional()
  @IsString()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  customer_address?: string;

  // موقع التنفيذ — من وين هيتخصم المخزون لهذا الطلب (Main Warehouse / Fulfillment Center / Branch)
  @IsUUID('4', { message: 'لازم تحدد موقع التنفيذ (warehouse_id)' })
  warehouse_id: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'الطلب يجب أن يحتوي منتجًا واحدًا على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class PayOrderDto {
  @IsIn(['cash', 'paid'], { message: 'طريقة الدفع يجب أن تكون cash أو paid' })
  payment_method: 'cash' | 'paid';
}

export class AssignDriverDto {
  @IsUUID('4', { message: 'معرّف السائق غير صالح' })
  driver_id: string;
}

export class ListOrdersQueryDto {
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
  @IsIn(['pending', 'confirmed', 'payment_failed', 'inventory_failed', 'out_for_delivery', 'delivered'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string; // بحث باسم العميل

  @IsOptional()
  @IsString()
  from_date?: string; // ISO date

  @IsOptional()
  @IsString()
  to_date?: string; // ISO date
}
