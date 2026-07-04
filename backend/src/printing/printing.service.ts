import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import PDFDocument = require('pdfkit');
import { Response } from 'express';
import { ARABIC_FONT_PATH, isArabic, renderRTLLine, shapeArabic } from '../common/pdf-arabic.util';

const MM_TO_PT = 2.83465;

@Injectable()
export class PrintingService {
  constructor(private db: DbService) {}

  private async loadOrder(tenantId: string, orderId: string) {
    const orderRes = await this.db.query(
      `SELECT o.*, w.name AS warehouse_name, d.name AS driver_name
       FROM orders o
       LEFT JOIN warehouses w ON w.id = o.warehouse_id
       LEFT JOIN drivers d ON d.id = o.driver_id
       WHERE o.id = $1 AND o.tenant_id = $2`,
      [orderId, tenantId],
    );
    if (orderRes.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    const order = orderRes.rows[0];
    const itemsRes = await this.db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    return { order, items: itemsRes.rows };
  }

  // === A4 Pick Ticket — للتجهيز داخل المستودع ===
  async generatePickTicket(tenantId: string, orderId: string, res: Response) {
    const { order, items } = await this.loadOrder(tenantId, orderId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=pick-ticket-${orderId}.pdf`);
    doc.pipe(res);
    doc.registerFont('Arabic', ARABIC_FONT_PATH);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;

    doc.font('Helvetica-Bold').fontSize(20).text('Pick Ticket', leftX, doc.y, { width: pageWidth, align: 'left' });
    doc.font('Arabic').fontSize(16).text(shapeArabic('بطاقة تجهيز'), leftX, doc.y, { width: pageWidth, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#000').lineWidth(1.5).stroke();
    doc.moveDown(0.8);

    // معلومات أساسية — كبيرة وواضحة (المستند ده بيتشاف بسرعة داخل المستودع، مش قاري بالتفصيل)
    doc.font('Helvetica-Bold').fontSize(13).text(`Order: ${order.id.slice(0, 8).toUpperCase()}`, leftX, doc.y);

    doc.font('Helvetica').fontSize(11).text('Customer: ', leftX, doc.y + 4, { continued: true });
    if (isArabic(order.customer_name)) {
      doc.font('Arabic').text(shapeArabic(order.customer_name), { continued: false });
    } else {
      doc.font('Helvetica').text(order.customer_name, { continued: false });
    }

    doc.fillColor('#2563eb').font('Helvetica-Bold').fontSize(13).text('Pick From: ', leftX, doc.y + 6, { continued: true });
    const warehouseName = order.warehouse_name || '-';
    if (isArabic(warehouseName)) {
      doc.font('Arabic').text(shapeArabic(warehouseName), { continued: false });
    } else {
      doc.font('Helvetica-Bold').text(warehouseName, { continued: false });
    }
    doc.fillColor('#000');
    doc.moveDown(1.2);

    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.6);

    // جدول العناصر مع مربع تأشير فاضي لكل صنف (يتعلّم عليه الـ Picker يدويًا)
    const col = { check: leftX, name: leftX + 30, qty: leftX + pageWidth - 80 };

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('', col.check, doc.y);
    doc.text('Item', col.name, doc.y - doc.currentLineHeight());
    doc.text('Qty', col.qty, doc.y - doc.currentLineHeight());
    doc.moveDown(0.5);
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#000').stroke();
    doc.moveDown(0.5);

    for (const item of items) {
      const rowY = doc.y;
      // مربع تأشير فاضي
      doc.rect(col.check, rowY + 2, 14, 14).strokeColor('#000').lineWidth(1).stroke();

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(item.product_name_snapshot_en || item.product_name_snapshot, col.name, rowY, {
        width: col.qty - col.name - 10,
      });
      doc.font('Helvetica-Bold').fontSize(14).text(String(item.quantity), col.qty, rowY);

      if (isArabic(item.product_name_snapshot)) {
        doc.font('Arabic').fontSize(10).fillColor('#555');
        doc.text(shapeArabic(item.product_name_snapshot), col.name, doc.y + 1, {
          width: col.qty - col.name - 10,
          align: 'left',
        });
        doc.fillColor('#000');
      }

      doc.moveDown(0.8);
      doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#eee').stroke();
      doc.moveDown(0.5);
    }

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).text('Picker Name: _______________________     Signature: _______________________', leftX, doc.y);
    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(9).fillColor('#999').text(`Printed: ${new Date().toLocaleString('en-GB')}`, leftX, doc.y);

    doc.end();
  }

  // === Thermal Receipt — إيصال حراري للسائق (80mm افتراضي، أو 40mm) ===
  async generateReceipt(tenantId: string, orderId: string, widthMm: number, res: Response) {
    const { order, items } = await this.loadOrder(tenantId, orderId);

    const width = (widthMm === 40 ? 40 : 80) * MM_TO_PT;
    const estimatedHeight = 200 + items.length * 30;

    const doc = new PDFDocument({ size: [width, estimatedHeight], margin: 8 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receipt-${orderId}.pdf`);
    doc.pipe(res);
    doc.registerFont('Arabic', ARABIC_FONT_PATH);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;
    const fontSize = widthMm === 40 ? 7 : 9;

    doc.font('Helvetica-Bold').fontSize(fontSize + 3).text('Nexora OS', leftX, doc.y, { width: pageWidth, align: 'center' });
    doc.font('Helvetica').fontSize(fontSize).text(`Order #${order.id.slice(0, 8).toUpperCase()}`, leftX, doc.y, {
      width: pageWidth,
      align: 'center',
    });
    doc.moveDown(0.3);
    this.dashedLine(doc, leftX, pageWidth);
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fontSize(fontSize);
    if (isArabic(order.customer_name)) {
      doc.font('Arabic').text(shapeArabic(order.customer_name), leftX, doc.y, { width: pageWidth });
    } else {
      doc.font('Helvetica-Bold').text(order.customer_name, leftX, doc.y, { width: pageWidth });
    }
    if (order.customer_phone) {
      doc.font('Helvetica').fontSize(fontSize).text(`Tel: ${order.customer_phone}`, leftX, doc.y);
    }
    if (order.customer_address) {
      if (isArabic(order.customer_address)) {
        doc.font('Arabic').fontSize(fontSize).text(shapeArabic(order.customer_address), leftX, doc.y, { width: pageWidth });
      } else {
        doc.font('Helvetica').fontSize(fontSize).text(order.customer_address, leftX, doc.y, { width: pageWidth });
      }
    }
    doc.moveDown(0.3);
    this.dashedLine(doc, leftX, pageWidth);
    doc.moveDown(0.3);

    for (const item of items) {
      const lineTotal = (Number(item.unit_price) * item.quantity).toFixed(3);
      doc.font('Helvetica').fontSize(fontSize).text(
        `${item.quantity}x ${item.product_name_snapshot_en || item.product_name_snapshot}`,
        leftX,
        doc.y,
        { width: pageWidth * 0.7, continued: false },
      );
      doc.font('Helvetica').fontSize(fontSize).text(lineTotal, leftX + pageWidth * 0.7, doc.y - doc.currentLineHeight(), {
        width: pageWidth * 0.3,
        align: 'right',
      });
    }

    doc.moveDown(0.3);
    this.dashedLine(doc, leftX, pageWidth);
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fontSize(fontSize + 1).text(`TOTAL: ${Number(order.total).toFixed(3)} KWD`, leftX, doc.y, {
      width: pageWidth,
      align: 'center',
    });

    if (order.driver_name) {
      doc.moveDown(0.4);
      const driverY = doc.y;
      if (isArabic(order.driver_name)) {
        renderRTLLine(doc, leftX, pageWidth, driverY, fontSize, [
          { text: order.driver_name, arabic: true },
          { text: ' :Driver', arabic: false },
        ], 'center');
        doc.y = driverY + fontSize + 4;
      } else {
        doc.font('Helvetica').fontSize(fontSize).text(`Driver: ${order.driver_name}`, leftX, driverY, {
          width: pageWidth,
          align: 'center',
        });
      }
    }

    doc.moveDown(0.5);
    const thanksY = doc.y;
    renderRTLLine(doc, leftX, pageWidth, thanksY, fontSize - 1, [
      { text: 'Thank you / ', arabic: false },
      { text: 'شكرًا', arabic: true },
    ], 'center');
    doc.y = thanksY + fontSize + 4;

    doc.end();
  }

  private dashedLine(doc: PDFKit.PDFDocument, leftX: number, width: number) {
    doc.save();
    doc.dash(2, { space: 2 });
    doc.moveTo(leftX, doc.y).lineTo(leftX + width, doc.y).strokeColor('#000').stroke();
    doc.undash();
    doc.restore();
  }
}
