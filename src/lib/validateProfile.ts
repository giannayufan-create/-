import { z } from 'zod';

export type ProfileField = 'name' | 'phone' | 'billingAddress' | 'shippingAddress';
export type ProfileForm = Record<ProfileField, string>;
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

const profileSchema = z.object({
  name: z.string().trim().min(1, '請填寫姓名或店名').min(2, '姓名或店名至少需要 2 個字'),
  phone: z.string().trim()
    .min(1, '請填寫聯絡電話')
    .regex(/^09\d{8}$/, '電話格式錯誤，請輸入 09 開頭的 10 碼手機（例：0912345678）'),
  shippingAddress: z.string().trim()
    .min(1, '請填寫送貨地址')
    .min(5, '送貨地址太短，請輸入完整地址（含縣市、區、路名）'),
  billingAddress: z.string().trim(),
}).superRefine((data, ctx) => {
  if (data.billingAddress && data.billingAddress.length < 5) {
    ctx.addIssue({
      code: 'custom',
      path: ['billingAddress'],
      message: '通訊地址太短，請輸入完整地址或留空',
    });
  }
});

/** 輸入時自動整理手機：去空白、全形轉半形數字 */
export function normalizePhoneInput(raw: string): string {
  return raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
    .slice(0, 10);
}

export function validateProfileForm(form: ProfileForm): ProfileFieldErrors {
  const result = profileSchema.safeParse({
    name: form.name,
    phone: form.phone,
    shippingAddress: form.shippingAddress,
    billingAddress: form.billingAddress || '',
  });
  if (result.success) return {};
  const errors: ProfileFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as ProfileField;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function getFirstProfileError(errors: ProfileFieldErrors): string | null {
  const order: ProfileField[] = ['name', 'phone', 'shippingAddress', 'billingAddress'];
  for (const key of order) {
    if (errors[key]) return errors[key]!;
  }
  return null;
}
