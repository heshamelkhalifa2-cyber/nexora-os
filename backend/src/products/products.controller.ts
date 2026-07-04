import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateProductDto, ListProductsQueryDto, TransferStockDto, UpdateStockDto } from './dto/products.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(user.tenantId, query.page, query.limit, query.search);
  }

  // تفاصيل المخزون لمنتج واحد مقسّمة حسب كل موقع
  @Get(':id/stock')
  getStockBreakdown(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.findStockBreakdown(user.tenantId, id);
  }

  @Roles('company_admin', 'super_admin', 'manager', 'warehouse_staff')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateProductDto) {
    return this.productsService.create(
      user.tenantId,
      user.sub,
      body.name,
      body.price,
      body.initial_stock,
      body.warehouse_id,
      body.name_en,
    );
  }

  // تعديل مخزون منتج في موقع محدد
  @Roles('company_admin', 'super_admin', 'manager', 'warehouse_staff')
  @Patch(':id/stock')
  updateStock(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateStockDto) {
    return this.productsService.updateStock(user.tenantId, user.sub, id, body.warehouse_id, body.quantity);
  }

  // نقل مخزون بين موقعين
  @Roles('company_admin', 'super_admin', 'manager', 'warehouse_staff')
  @Post(':id/transfer')
  transferStock(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: TransferStockDto) {
    return this.productsService.transferStock(
      user.tenantId,
      user.sub,
      id,
      body.from_warehouse_id,
      body.to_warehouse_id,
      body.quantity,
    );
  }
}
