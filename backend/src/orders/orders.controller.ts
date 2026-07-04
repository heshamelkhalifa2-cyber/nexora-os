import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AssignDriverDto, CreateOrderDto, ListOrdersQueryDto, PayOrderDto } from './dto/orders.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // كل الأدوار تقدر تشوف الطلبات (Reports Viewer محتاجها أساسًا لطبيعة دوره)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOne(user.tenantId, id);
  }

  // إنشاء طلب: كل اللي شغلته إنشاء طلبات — Order Taker موجود هنا تحديدًا وبس هنا
  @Roles('company_admin', 'super_admin', 'manager', 'cashier', 'pos_operator', 'order_taker')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(
      user.tenantId,
      user.sub,
      body.customer_name,
      body.warehouse_id,
      body.items,
      body.customer_phone,
      body.customer_address,
    );
  }

  // الدفع: عملية مالية — Order Taker مُستبعد عمدًا (حسب النص الأصلي: "لا صلاحيات مالية أو مخزون")
  @Roles('company_admin', 'super_admin', 'manager', 'cashier', 'pos_operator')
  @Post(':id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PayOrderDto) {
    return this.ordersService.pay(user.tenantId, user.sub, id, body.payment_method);
  }

  // بدء التجهيز (Picking): Warehouse Staff أساسًا، مع صلاحية الإدارة للإشراف
  @Roles('company_admin', 'super_admin', 'manager', 'warehouse_staff')
  @Post(':id/start-picking')
  startPicking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.startPicking(user.tenantId, id, user.sub);
  }

  // إنهاء التجهيز (Packing) — هذا الاستدعاء نفسه يمثّل الـ Scan الإلزامي
  @Roles('company_admin', 'super_admin', 'manager', 'warehouse_staff')
  @Post(':id/complete-packing')
  completePacking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.completePacking(user.tenantId, id, user.sub);
  }

  // تعيين سائق: قرار تشغيلي — Admin/Manager فقط
  @Roles('company_admin', 'super_admin', 'manager')
  @Post(':id/assign-driver')
  assignDriver(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AssignDriverDto) {
    return this.ordersService.assignDriver(user.tenantId, id, body.driver_id);
  }

  // تأكيد التسليم: Admin/Manager أو السائق نفسه (لطلبه هو بس)
  @Roles('company_admin', 'super_admin', 'manager', 'driver')
  @Post(':id/deliver')
  deliver(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const requestingDriverUserId = user.role === 'driver' ? user.sub : undefined;
    return this.ordersService.markDelivered(user.tenantId, id, requestingDriverUserId);
  }
}
