import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateWarehouseDto } from './dto/warehouses.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  // كل الأدوار تقدر تشوف المواقع (محتاجينها لاختيار موقع التنفيذ وقت إنشاء الطلب)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.warehousesService.findAll(user.tenantId);
  }

  // إنشاء موقع جديد: إدارة فقط
  @Roles('company_admin', 'super_admin', 'manager', 'warehouse_staff')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateWarehouseDto) {
    return this.warehousesService.create(user.tenantId, body.name, body.type);
  }
}
