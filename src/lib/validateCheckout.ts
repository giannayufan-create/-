import { z } from 'zod';
import { deliveryDateBounds, type DeliverySchedule } from './deliverySlots';

export const checkoutSchema = z.object({
  deliveryMethod: z.string().min(1, '請選擇配送方式'),
  paymentMethod: z.string().min(1, '請選擇付款方式'),
  deliveryDate: z.string().min(1, '請選擇配送日期'),
  deliveryTime: z.string().min(1, '請選擇配送時段'),
});

export type CheckoutForm = z.infer<typeof checkoutSchema>;
export type CheckoutFieldErrors = Partial<Record<keyof CheckoutForm, string>>;

export function validateCheckoutForm(form: CheckoutForm, schedule?: DeliverySchedule): CheckoutFieldErrors {
  const base = checkoutSchema.safeParse(form);
  const errors: CheckoutFieldErrors = {};
  if (!base.success) {
    for (const issue of base.error.issues) {
      const key = issue.path[0] as keyof CheckoutForm;
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }
  if (form.deliveryDate) {
    const { min, max } = deliveryDateBounds(schedule);
    if (form.deliveryDate < min) {
      errors.deliveryDate = '配送日期過早，請改選其他日期';
    } else if (form.deliveryDate > max) {
      errors.deliveryDate = `配送日期不可超過可預約範圍（最多 ${schedule?.deliveryMaxDays ?? 30} 天）`;
    }
  }
  return errors;
}

export function getFirstCheckoutError(errors: CheckoutFieldErrors): string | null {
  const order: (keyof CheckoutForm)[] = ['deliveryMethod', 'paymentMethod', 'deliveryDate', 'deliveryTime'];
  for (const key of order) {
    if (errors[key]) return errors[key]!;
  }
  return null;
}
