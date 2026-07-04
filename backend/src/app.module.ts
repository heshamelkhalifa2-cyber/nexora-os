import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryModule } from './delivery/delivery.module';
import { InvoiceModule } from './invoice/invoice.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PrintingModule } from './printing/printing.module';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';

@Module({
  imports: [
    DbModule,
    AuthModule,
    WarehousesModule,
    ProductsModule,
    OrdersModule,
    DeliveryModule,
    InvoiceModule,
    PrintingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
