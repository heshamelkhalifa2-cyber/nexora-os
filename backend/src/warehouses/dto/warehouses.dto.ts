import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @MinLength(1, { message: 'اسم الموقع مطلوب' })
  name: string;

  @IsIn(['main_warehouse', 'fulfillment_center', 'branch'], {
    message: 'النوع يجب أن يكون main_warehouse أو fulfillment_center أو branch',
  })
  type: 'main_warehouse' | 'fulfillment_center' | 'branch';
}
