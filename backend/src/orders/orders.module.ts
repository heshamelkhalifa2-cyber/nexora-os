import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { WarehousesModule } from '../warehouses/warehouses.module';

@Module({
  imports: [AuthModule, WarehousesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
