import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, MessageCircle, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { useSiteSettings } from '../lib/useSettings';
import { sendWeb3Form } from '../lib/orderNotify';

export default function ContactModal() {
  const { user, userData, isContactOpen, setContactOpen, setAuthModalOpen } = useStore();
  const { settings } = useSiteSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [a, b] = useMemo(() => [Math.floor(Math.random() * 9) + 6, Math.floor(Math.random() * 9) + 1], [isContactOpen]);
  const [captcha, setCaptcha] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isContactOpen) return;
    setDone(false);
    setError('');
    setCaptcha('');
    setMessage('');
    setOrderId('');
    if (user) {
      setName(userData?.name || user.displayName || '');
      setEmail(user.email || userData?.email || '');
      setPhone(userData?.phone || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
    }
  }, [isContactOpen, user, userData]);

  if (!isContactOpen) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('請填寫姓名、信箱與詢問內容');
      return;
    }
    if (Number(captcha) !== a + b) {
      setError('驗證碼不正確');
      return;
    }
    const key = settings.web3formsAccessKey?.trim();
    if (!key) {
      setError('店家尚未設定通知金鑰，請改用 LINE 或電話聯絡');
      return;
    }
    setLoading(true);
    try {
      await sendWeb3Form(key, {
        subject: `📩【${settings.storeName}】聯絡我們${orderId ? ` #${orderId}` : ''}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: [
          `姓名：${name.trim()}`,
          `信箱：${email.trim()}`,
          `電話：${phone.trim() || '—'}`,
          `訂單編號：${orderId.trim() || '—'}`,
          '',
          message.trim(),
        ].join('\n'),
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || '送出失敗，請稍後再試或改用 LINE');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[420] bg-[var(--color-ink)]/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setContactOpen(false)}>
      <div
        className="w-full max-w-3xl bg-[#fffcf8] rounded-3xl border border-[#eadfce] overflow-hidden shadow-[0_30px_80px_-24px_rgba(28,20,16,0.5)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eadfce] bg-[#f6efe6]">
          <h2 className="font-display font-bold text-lg text-[var(--color-ink)] tracking-wide">聯絡我們</h2>
          <button type="button" onClick={() => setContactOpen(false)} className="p-2 text-[#9a8674] hover:text-[var(--color-ink)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid md:grid-cols-[0.9fr_1.2fr] gap-0">
          <aside className="p-6 md:p-8 bg-[linear-gradient(165deg,#2a211c_0%,#1c1410_60%,#3a2418_100%)] text-[#d9c8b6]">
            <div className="brand-mark w-12 h-12 rounded-xl flex items-center justify-center text-white font-display text-lg font-bold mb-4">滷</div>
            <h3 className="font-display text-2xl font-bold text-white tracking-wide mb-2">{settings.storeName}</h3>
            <p className="text-sm text-[#b8a48f] leading-relaxed mb-6">{settings.storeDescription}</p>
            <div className="space-y-3 text-sm">
              {settings.storeAddress && (
                <p className="flex items-start gap-2.5"><MapPin className="w-4 h-4 text-[var(--color-ember)] shrink-0 mt-0.5" /><span><span className="text-[#f0d2b0] font-bold">地址</span><br />{settings.storeAddress}</span></p>
              )}
              {settings.storePhone && (
                <a href={`tel:${settings.storePhone}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-[var(--color-ember)]" />
                  <span><span className="text-[#f0d2b0] font-bold">電話</span><br />{settings.storePhone}</span>
                </a>
              )}
              {(settings.lineUrl || settings.lineId) && (
                <a
                  href={settings.lineUrl?.trim() || `https://line.me/R/ti/p/@${(settings.lineId || '').replace(/^@/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-[#e8c49a] hover:text-white font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>LINE {settings.lineId || '立即聯繫'}</span>
                </a>
              )}
              {!settings.storePhone && !settings.lineUrl && !settings.lineId && (
                <p className="text-xs text-[#9a8674]">請至後台「店家資訊」填寫電話與 LINE</p>
              )}
            </div>
            {!user && (
              <button type="button" onClick={() => { setContactOpen(false); setAuthModalOpen(true); }}
                className="mt-8 text-xs font-bold text-[#f0d2b0] underline underline-offset-4">
                已有帳號？登入後自動帶入資料
              </button>
            )}
          </aside>

          <div className="p-6 md:p-8">
            {done ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <CheckCircle className="w-12 h-12 text-emerald-600 mb-3" />
                <p className="font-display font-bold text-lg text-[var(--color-ink)]">已送出！</p>
                <p className="text-sm text-[#7a6555] mt-2">我們會盡快回覆您</p>
                <button type="button" onClick={() => setContactOpen(false)} className="mt-6 btn-copper px-6 py-2.5 rounded-xl text-sm font-bold">關閉</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                <label className="block text-xs font-bold text-[#7a6555]">姓名 *
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="請輸入姓名"
                    className="mt-1 w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
                </label>
                <label className="block text-xs font-bold text-[#7a6555]">電子信箱 *
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="請輸入電子信箱"
                    className="mt-1 w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
                </label>
                <label className="block text-xs font-bold text-[#7a6555]">聯絡電話（選填）
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="請輸入聯絡電話"
                    className="mt-1 w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
                </label>
                <label className="block text-xs font-bold text-[#7a6555]">訂單編號（選填，客戶自行填寫）
                  <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="若有訂單問題請填寫訂單編號"
                    className="mt-1 w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
                </label>
                <label className="block text-xs font-bold text-[#7a6555]">詢問內容 *
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="請輸入您想對店家說的話…"
                    className="mt-1 w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
                </label>
                <div className="flex items-end gap-3">
                  <label className="flex-1 block text-xs font-bold text-[#7a6555]">驗證碼 *
                    <input value={captcha} onChange={(e) => setCaptcha(e.target.value)} placeholder="請輸入右側算式答案"
                      className="mt-1 w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
                  </label>
                  <div className="shrink-0 px-4 py-3 rounded-xl bg-[var(--color-ink)] text-[#f0d2b0] font-display font-bold text-sm">
                    {a}+{b}=
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full mt-2 btn-copper font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />送出中…</> : <><Send className="w-4 h-4" />確定送出</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
