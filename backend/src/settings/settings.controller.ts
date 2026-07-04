import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { UpdateSettingsDto } from './dto/settings.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // كل الأدوار تقدر تشوف الإعدادات (محتاجينها لعرض اللغة/الثيم الافتراضي والعملة بالواجهة)
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.settingsService.get(user.tenantId);
  }

  // التعديل: company_admin/super_admin فقط
  @Roles('company_admin', 'super_admin')
  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() body: UpdateSettingsDto) {
    return this.settingsService.update(user.tenantId, body);
  }
}
