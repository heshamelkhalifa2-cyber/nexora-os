import { BadRequestException } from '@nestjs/common';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'payment_failed'
  | 'inventory_failed'
  | 'picking_started'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered';

// خريطة الانتقالات المسموحة — أي انتقال غير موجود هنا يُرفض تلقائيًا.
// القاعدة الحرجة هنا: confirmed → out_for_delivery غير مسموح إطلاقًا،
// لازم يمر أولًا بـ picking_started ثم packed (Scan إلزامي من الـ Packer).
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'payment_failed', 'inventory_failed'],
  confirmed: ['picking_started'],
  picking_started: ['packed'],
  packed: ['out_for_delivery'],
  payment_failed: [],
  inventory_failed: [],
  out_for_delivery: ['delivered'],
  delivered: [],
};

export function assertTransitionAllowed(current: OrderStatus, next: OrderStatus) {
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `لا يمكن تحويل الطلب من "${current}" إلى "${next}". الانتقالات المسموحة من "${current}": ${
        allowed.length ? allowed.join(', ') : 'لا يوجد (حالة نهائية)'
      }`,
    );
  }
}
