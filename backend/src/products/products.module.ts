import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthModule } from '../auth/auth.module';
import { WarehousesModule } from '../warehouses/warehouses.module';

@Module({
  imports: [AuthModule, WarehousesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
