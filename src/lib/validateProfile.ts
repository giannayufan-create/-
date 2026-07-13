export type ProfileField = 'name' | 'phone' | 'billingAddress' | 'shippingAddress';

export type ProfileForm = Record<ProfileField, string>;
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

export function validateProfileForm(form: ProfileForm): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  const name = form.name.trim();
  if (!name) {
    errors.name = '請填寫姓名或店名';
  } else if (name.length < 2) {
    errors.name = '姓名或店名至少需要 2 個字';
  }

  const phone = form.phone.trim();
  if (!phone) {
    errors.phone = '請填寫聯絡電話';
  } else if (!/^09\d{8}$/.test(phone)) {
    errors.phone = '電話格式錯誤，請輸入 09 開頭的 10 碼手機（例：0912345678）';
  }

  const shipping = form.shippingAddress.trim();
  if (!shipping) {
    errors.shippingAddress = '請填寫送貨地址';
  } else if (shipping.length < 5) {
    errors.shippingAddress = '送貨地址太短，請輸入完整地址（含縣市、區、路名）';
  }

  const billing = form.billingAddress.trim();
  if (billing && billing.length < 5) {
    errors.billingAddress = '通訊地址太短，請輸入完整地址或留空';
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
