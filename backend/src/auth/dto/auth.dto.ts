import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/roles.decorator';

export class RegisterDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'كلمة المرور مطلوبة' })
  password: string;
}

export class CreateStaffDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;

  @IsIn(
    [
      'super_admin',
      'company_admin',
      'manager',
      'cashier',
      'warehouse_staff',
      'driver',
      'groomer',
      'pos_operator',
      'order_taker',
      'reports_viewer',
    ],
    { message: 'الدور غير صالح' },
  )
  role: Role;
}
