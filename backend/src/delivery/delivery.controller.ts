import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateDriverDto } from './dto/delivery.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.deliveryService.findDrivers(user.tenantId);
  }

  @Roles('company_admin', 'super_admin', 'manager')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateDriverDto) {
    return this.deliveryService.createDriver(user.tenantId, body.name);
  }
}
