import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import PDFDocument = require('pdfkit');
import { Response } from 'express';
import * as path from 'path';
// @ts-ignore
import ArabicReshaperLib from 'arabic-reshaper';

const ARABIC_FONT_PATH = path.join(__dirname, 'fonts', 'Arabic-Regular.ttf');
const ARABIC_RANGE = /[\u0600-\u06FF]/;

function shapeArabic(text: string): string {
  try {
    const reshaper: any = (ArabicReshaperLib as any).default || ArabicReshaperLib;
    return reshaper.convertArabic(text);
  } catch {
    return text;
  }
}

function isArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'بانتظار الدفع', en: 'Pending Payment' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  payment_failed: { ar: 'فشل الدفع', en: 'Payment Failed' },
  inventory_failed: { ar: 'فشل - مخزون غير كافٍ', en: 'Failed - Insufficient Stock' },
  picking_started: { ar: 'جاري التجهيز', en: 'Picking in Progress' },
  packed: { ar: 'تم التغليف', en: 'Packed' },
  out_for_delivery: { ar: 'في الطريق', en: 'Out for Delivery' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
};

const PAYMENT_LABELS: Record<string, { ar: string; en: string }> = {
  cash: { ar: 'نقدًا', en: 'Cash' },
  paid: { ar: 'مدفوع', en: 'Paid' },
};

interface Segment {
  text: string;
  arabic: boolean; // true = يُشكَّل ويترسم بالخط العربي، false = يترسم بـ Helvetica كما هو
}

@Injectable()
export class InvoiceService {
  constructor(private db: DbService) {}

  async generate(tenantId: string, orderId: string, res: Response) {
    const orderRes = await this.db.query('SELECT * FROM orders WHERE id = $1 AND tenant_id = $2', [
      orderId,
      tenantId,
    ]);
    if (orderRes.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    const order = orderRes.rows[0];

    const itemsRes = await this.db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    const items = itemsRes.rows;

    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${orderId}.pdf`);
    doc.pipe(res);

    doc.registerFont('Arabic', ARABIC_FONT_PATH);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;

    // === Header ===
    doc.font('Helvetica-Bold').fontSize(18).text('Nexora OS - Tax Invoice', leftX, doc.y, { width: pageWidth, align: 'left' });
    doc.font('Arabic').fontSize(16).text(shapeArabic('نيكسورا، فاتورة ضريبية'), leftX, doc.y, { width: pageWidth, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.8);

    const statusInfo = STATUS_LABELS[order.status] || { ar: order.status, en: order.status };
    const paymentInfo = order.payment_method
      ? PAYMENT_LABELS[order.payment_method] || { ar: order.payment_method, en: order.payment_method }
      : null;

    this.field(doc, leftX, pageWidth, 'Order ID', order.id, 'رقم الطلب', order.id);
    this.field(doc, leftX, pageWidth, 'Customer', order.customer_name, 'العميل', order.customer_name);
    const dateStr = new Date(order.created_at).toLocaleString('en-GB');
    this.field(doc, leftX, pageWidth, 'Date', dateStr, 'التاريخ', dateStr);
    this.field(doc, leftX, pageWidth, 'Status', statusInfo.en, 'الحالة', statusInfo.ar);
    if (paymentInfo) {
      this.field(doc, leftX, pageWidth, 'Payment Method', paymentInfo.en, 'طريقة الدفع', paymentInfo.ar);
    }

    doc.moveDown(0.8);
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.8);

    // === جدول المنتجات ===
    const col = { name: leftX, qty: leftX + pageWidth * 0.45, price: leftX + pageWidth * 0.62, total: leftX + pageWidth * 0.8 };

    doc.font('Helvetica-Bold').fontSize(10);
    const headerY = doc.y;
    doc.text('Item', col.name, headerY);
    doc.text('Qty', col.qty, headerY);
    doc.text('Unit Price', col.price, headerY);
    doc.text('Total', col.total, headerY);
    doc.moveDown(0.6);
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#000').stroke();
    doc.moveDown(0.4);

    for (const item of items) {
      const lineTotal = (Number(item.unit_price) * item.quantity).toFixed(3);
      const rowY = doc.y;

      doc.font('Helvetica').fontSize(10);
      doc.text(item.product_name_snapshot_en || item.product_name_snapshot, col.name, rowY, { width: col.qty - col.name - 5 });
      doc.text(String(item.quantity), col.qty, rowY);
      doc.text(Number(item.unit_price).toFixed(3), col.price, rowY);
      doc.text(lineTotal, col.total, rowY);

      const arName = item.product_name_snapshot;
      if (isArabic(arName)) {
        doc.font('Arabic').fontSize(9).fillColor('#555');
        doc.text(shapeArabic(arName), col.name, doc.y + 1, { width: col.qty - col.name - 5, align: 'left' });
        doc.fillColor('#000');
      }

      doc.moveDown(0.5);
    }

    doc.moveDown(0.3);
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    // === الإجمالي ===
    const totalY = doc.y;
    doc.font('Helvetica-Bold').fontSize(13).text(`Total: ${Number(order.total).toFixed(3)} KWD`, leftX, totalY, {
      width: pageWidth,
      align: 'left',
    });
    this.renderRTLLine(doc, leftX, pageWidth, totalY, 13, [
      { text: 'دينار كويتي ', arabic: true },
      { text: Number(order.total).toFixed(3), arabic: false },
      { text: ' الإجمالي', arabic: true },
    ]);
    doc.y = totalY + 22;

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(8).fillColor('#999').text('Generated by Nexora OS', leftX, doc.y, {
      width: pageWidth,
      align: 'center',
    });

    doc.end();
  }

  // دالة عامة: بترسم سطر بمحاذاة يمين، وبتختار الخط المناسب تلقائيًا حسب كل جزء —
  // ضرورية لأن الخط العربي (KACST) لا يحتوي أي حروف/أرقام/علامات ترقيم لاتينية إطلاقًا،
  // فأي محاولة لرسم نص لاتيني بيه بترجع مربعات فاضية (tofu) بدل النص.
  private renderRTLLine(
    doc: PDFKit.PDFDocument,
    leftX: number,
    pageWidth: number,
    y: number,
    fontSize: number,
    segments: Segment[],
  ) {
    const prepared = segments.map((s) => (s.arabic ? shapeArabic(s.text) : s.text));

    const widths = segments.map((s, i) => {
      doc.font(s.arabic ? 'Arabic' : 'Helvetica').fontSize(fontSize);
      return doc.widthOfString(prepared[i]);
    });
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const startX = leftX + pageWidth - totalWidth;

    let x = startX;
    segments.forEach((s, i) => {
      doc.font(s.arabic ? 'Arabic' : 'Helvetica').fontSize(fontSize);
      // بنحدد x بالحساب اليدوي لكل جزء بدل الاعتماد على continued —
      // أضمن ومايأثرش على تقدّم doc.y التلقائي، وبيتفادى تعارض المؤشر بين الأسطر
      doc.text(prepared[i], x, y, { lineBreak: false });
      x += widths[i];
    });
  }

  // حقل ثنائي اللغة عام — يتعامل صح مع أي تركيبة (قيمة عربية أو لاتينية، تسمية عربية ثابتة)
  private field(
    doc: PDFKit.PDFDocument,
    leftX: number,
    pageWidth: number,
    labelEn: string,
    valueEn: string,
    labelAr: string,
    valueAr: string,
  ) {
    const y = doc.y;

    // === السطر الإنجليزي (شمال) ===
    doc.font('Helvetica').fontSize(10);
    const enPrefix = `${labelEn}: `;
    doc.text(enPrefix, leftX, y, { lineBreak: false });
    const enPrefixWidth = doc.widthOfString(enPrefix);
    if (isArabic(valueEn)) {
      doc.font('Arabic').text(shapeArabic(valueEn), leftX + enPrefixWidth, y, { lineBreak: false });
    } else {
      doc.font('Helvetica').text(valueEn, leftX + enPrefixWidth, y, { lineBreak: false });
    }

    // === السطر العربي (يمين) ===
    if (isArabic(valueAr)) {
      this.renderRTLLine(doc, leftX, pageWidth, y, 10, [{ text: `${labelAr} ${valueAr}`, arabic: true }]);
    } else {
      this.renderRTLLine(doc, leftX, pageWidth, y, 10, [
        { text: valueAr, arabic: false },
        { text: ` ${labelAr}`, arabic: true },
      ]);
    }

    // تحكم يدوي بالمؤشر الرأسي — أضمن من الاعتماد على التقدّم التلقائي بعد استخدام lineBreak:false
    doc.y = y + 16;
  }
}
