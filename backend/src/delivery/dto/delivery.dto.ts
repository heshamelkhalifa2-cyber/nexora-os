import { IsString, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(1, { message: 'اسم السائق مطلوب' })
  name: string;
}
