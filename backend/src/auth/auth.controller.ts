import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateStaffDto, LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // بوابة عامة: تعمل فقط لأول مستخدم بالشركة (Bootstrap company_admin) — راجع auth.service.ts
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  // إنشاء موظف بدور محدد — company_admin/super_admin فقط
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin', 'super_admin')
  @Post('staff')
  createStaff(@CurrentUser() user: AuthUser, @Body() body: CreateStaffDto) {
    return this.authService.createStaff(user.tenantId, body.email, body.password, body.role);
  }

  // قائمة الموظفين — company_admin/super_admin فقط
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin', 'super_admin')
  @Get('staff')
  listStaff(@CurrentUser() user: AuthUser) {
    return this.authService.listStaff(user.tenantId);
  }
}
