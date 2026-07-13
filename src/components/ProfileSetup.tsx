import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { updateUserProfile, applyLocalProfile, cacheUserProfile } from '../lib/users';
import { useSiteSettings } from '../lib/useSettings';
import { isOfflineError } from '../lib/firestoreConnect';
import { validateProfileForm, ProfileFieldErrors, ProfileForm } from '../lib/validateProfile';

const FIELDS = [
  { key: 'name' as const, label: '姓名或店名', placeholder: '例如：王小明 / XX餐廳', required: true },
  { key: 'phone' as const, label: '聯絡電話', placeholder: '0912345678', required: true },
  { key: 'billingAddress' as const, label: '通訊地址', placeholder: '發票或聯絡用地址（選填）', required: false },
  { key: 'shippingAddress' as const, label: '送貨地址', placeholder: '例：桃園市桃園區六福路 199 號', required: true },
];

export default function ProfileSetup() {
  const { user, userData, userRole, accessToken, isAuthLoading, isProfileReady, isProfileModalOpen, setProfileModalOpen, setUser } = useStore();
  const [form, setForm] = useState<ProfileForm>({ name: '', phone: '', billingAddress: '', shippingAddress: '' });
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const { texts } = useSiteSettings();

  const mustComplete = Boolean(userData && userRole !== 'admin' && !userData.isProfileComplete);
  const isOpen = mustComplete || isProfileModalOpen;

  useEffect(() => {
    if (!userData) return;
    setForm({
      name: userData.name || user?.displayName || '',
      phone: userData.phone || '',
      billingAddress: userData.billingAddress || '',
      shippingAddress: userData.shippingAddress || '',
    });
    setFieldErrors({});
    setGeneralError('');
  }, [userData, user, isProfileModalOpen]);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setGeneralError('');

    const errors = validateProfileForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const updated = await updateUserProfile(user.uid, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        billingAddress: form.billingAddress.trim() || form.shippingAddress.trim(),
        shippingAddress: form.shippingAddress.trim(),
      });
      setUser(user, userRole, accessToken, updated);
      cacheUserProfile(updated);
      setProfileModalOpen(false);
    } catch (e: any) {
      if (isOfflineError(e) && userData) {
        const local = applyLocalProfile(userData, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          billingAddress: form.billingAddress.trim() || form.shippingAddress.trim(),
          shippingAddress: form.shippingAddress.trim(),
        });
        setUser(user, userRole, accessToken, local);
        cacheUserProfile(local);
        setProfileModalOpen(false);
        return;
      }
      setGeneralError(e.message || '儲存失敗，請確認網路連線後重試');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !userData || isAuthLoading || !isProfileReady || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-[var(--color-ink)]/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fffcf8] rounded-3xl shadow-[0_24px_60px_-24px_rgba(28,20,16,0.45)] border border-[#eadfce] w-full max-w-md p-8 relative max-h-[90vh] overflow-y-auto">
        {!mustComplete && (
          <button onClick={() => setProfileModalOpen(false)} className="absolute top-4 right-4 text-[#9a8674] hover:text-[var(--color-ink)]">
            <X className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)] mb-1">
          {mustComplete ? `👋 ${texts.profileWelcome}` : '修改會員資料'}
        </h2>
        <p className="text-sm text-[#7a6555] mb-6">
          {mustComplete ? texts.profileWelcomeDesc : '更新您的聯絡與配送資訊'}
        </p>

        {generalError && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 flex items-start gap-2 border border-red-100">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-bold text-stone-700 mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input
                value={form[f.key]}
                onChange={(e) => updateField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={`w-full bg-stone-50 border rounded-xl p-3 text-sm focus:ring-2 focus:outline-none transition-colors ${
                  fieldErrors[f.key]
                    ? 'border-red-400 focus:ring-red-300 bg-red-50/50'
                    : 'border-stone-200 focus:ring-amber-400'
                }`}
              />
              {fieldErrors[f.key] && (
                <p className="text-red-600 text-xs font-bold mt-1.5 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {fieldErrors[f.key]}
                </p>
              )}
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />儲存中...</> : '完成設定'}
          </button>
        </form>
      </div>
    </div>
  );
}
