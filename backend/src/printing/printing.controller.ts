import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PrintingService } from './printing.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('orders/:id')
export class PrintingController {
  constructor(private printingService: PrintingService) {}

  @Get('pick-ticket')
  pickTicket(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    return this.printingService.generatePickTicket(req.user.tenantId, id, res);
  }

  @Get('receipt')
  receipt(@Req() req: any, @Param('id') id: string, @Query('width') width: string, @Res() res: Response) {
    return this.printingService.generateReceipt(req.user.tenantId, id, Number(width) || 80, res);
  }
}
