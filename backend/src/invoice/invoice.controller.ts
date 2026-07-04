import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('orders/:id/invoice')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Get()
  generate(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    return this.invoiceService.generate(req.user.tenantId, id, res);
  }
}
