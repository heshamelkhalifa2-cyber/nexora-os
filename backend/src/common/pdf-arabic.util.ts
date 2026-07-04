import * as path from 'path';
// @ts-ignore
import ArabicReshaperLib from 'arabic-reshaper';

export const ARABIC_FONT_PATH = path.join(__dirname, '..', 'invoice', 'fonts', 'Arabic-Regular.ttf');
const ARABIC_RANGE = /[\u0600-\u06FF]/;

const LATIN_DIGITS_TO_ARABIC: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

// الخط العربي (KACST) ما فيهوش أي أرقام أو علامات ترقيم لاتينية إطلاقًا، لكنه بيحتوي على
// أرقام عربية هندية (٠-٩) وفاصلة عربية (،) فعليًا. بنحوّل أي رقم/علامة لاتينية شائعة
// لمكافئها العربي قبل الرسم، بدل ما تظهر كمربعات فاضية (tofu).
function normalizeForArabicFont(text: string): string {
  return text
    .replace(/[0-9]/g, (d) => LATIN_DIGITS_TO_ARABIC[d])
    .replace(/,/g, '،')
    .replace(/[:\-.]/g, ' ');
}

export function shapeArabic(text: string): string {
  try {
    const reshaper: any = (ArabicReshaperLib as any).default || ArabicReshaperLib;
    const shaped = reshaper.convertArabic(normalizeForArabicFont(text));
    // عملية التشكيل بتعكس ترتيب أي مجموعة أرقام متتالية (زي رقم مبنى "12" بيبقى "21") —
    // بنرجّع ترتيب كل مجموعة أرقام عربية-هندية لوضعها الصحيح بعد التشكيل
    return shaped.replace(/[٠-٩]+/g, (match: string) => match.split('').reverse().join(''));
  } catch {
    return text;
  }
}

export function isArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

export interface PdfSegment {
  text: string;
  arabic: boolean;
}

// دالة عامة: بترسم سطر بمحاذاة يمين وبتختار الخط المناسب تلقائيًا لكل جزء —
// ضرورية لأن الخط العربي (KACST) ما فيهوش أي حروف/أرقام/علامات ترقيم لاتينية إطلاقًا.
export function renderRTLLine(
  doc: PDFKit.PDFDocument,
  leftX: number,
  pageWidth: number,
  y: number,
  fontSize: number,
  segments: PdfSegment[],
  align: 'right' | 'center' = 'right',
) {
  const prepared = segments.map((s) => (s.arabic ? shapeArabic(s.text) : s.text));

  const widths = segments.map((s, i) => {
    doc.font(s.arabic ? 'Arabic' : 'Helvetica').fontSize(fontSize);
    return doc.widthOfString(prepared[i]);
  });
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const startX = align === 'center' ? leftX + (pageWidth - totalWidth) / 2 : leftX + pageWidth - totalWidth;

  let x = startX;
  segments.forEach((s, i) => {
    doc.font(s.arabic ? 'Arabic' : 'Helvetica').fontSize(fontSize);
    doc.text(prepared[i], x, y, { lineBreak: false });
    x += widths[i];
  });
}
