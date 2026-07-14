import { z } from 'zod';
import { minDeliveryDate, maxDeliveryDate } from './deliverySlots';

export const checkoutSchema = z.object({
  deliveryMethod: z.string().min(1, '請選擇配送方式'),
  paymentMethod: z.string().min(1, '請選擇付款方式'),
  deliveryDate: z.string().min(1, '請選擇配送日期'),
  deliveryTime: z.string().min(1, '請選擇配送時段'),
}).superRefine((data, ctx) => {
  if (!data.deliveryDate) return;
  const min = minDeliveryDate();
  const max = maxDeliveryDate();
  if (data.deliveryDate < min) {
    ctx.addIssue({ code: 'custom', path: ['deliveryDate'], message: '配送日期不能早於今天' });
  }
  if (data.deliveryDate > max) {
    ctx.addIssue({ code: 'custom', path: ['deliveryDate'], message: '配送日期不可超過 30 天' });
  }
});

export type CheckoutForm = z.infer<typeof checkoutSchema>;
export type CheckoutFieldErrors = Partial<Record<keyof CheckoutForm, string>>;

export function validateCheckoutForm(form: CheckoutForm): CheckoutFieldErrors {
  const result = checkoutSchema.safeParse(form);
  if (result.success) return {};
  const errors: CheckoutFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof CheckoutForm;
    if (key && !errors[key]) errors[key] = issue.message;
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
