import { useState, type FormEvent } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  googleSignIn, facebookSignIn, yahooSignIn,
  loginWithEmail, registerWithEmail, resetPassword,
} from '../lib/firebase';
import { useStore } from '../lib/store';

export default function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, setSigningIn, user } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen || user) return null;

  const handleProvider = async (name: string, fn: () => Promise<unknown>) => {
    setError('');
    setLoading(true);
    setSigningIn(true);
    try {
      await fn();
      setAuthModalOpen(false);
    } catch (e: any) {
      setSigningIn(false);
      if (e.code === 'auth/unauthorized-domain') {
        setError('此網域尚未授權，請至 Firebase 控制台加入您的網址');
      } else if (e.code === 'auth/popup-closed-by-user') {
        setError('登入視窗已關閉，請重試');
      } else if (e.code === 'auth/operation-not-allowed') {
        setError(`${name} 登入尚未在 Firebase 啟用`);
      } else {
        setError(e.message || `${name} 登入失敗`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('請填寫信箱和密碼'); return; }
    if (mode === 'register') {
      if (password !== confirm) { setError('兩次密碼不一致'); return; }
      if (password.length < 6) { setError('密碼至少 6 個字元'); return; }
    }
    setLoading(true);
    setSigningIn(true);
    try {
      if (mode === 'login') await loginWithEmail(email, password);
      else await registerWithEmail(email, password);
      setAuthModalOpen(false);
      setEmail(''); setPassword(''); setConfirm('');
    } catch (err: any) {
      setSigningIn(false);
      const msgs: Record<string, string> = {
        'auth/invalid-credential': '帳號或密碼錯誤',
        'auth/email-already-in-use': '此信箱已註冊',
        'auth/weak-password': '密碼強度不足',
        'auth/too-many-requests': '嘗試次數過多，請稍後再試',
      };
      setError(msgs[err.code] || err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-ink)]/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fffcf8] rounded-3xl shadow-[0_24px_60px_-24px_rgba(28,20,16,0.45)] w-full max-w-md relative overflow-hidden border border-[#eadfce]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#d4894a,#b56a3a,#8f4e28)]" />
        <button type="button" onClick={() => setAuthModalOpen(false)} className="absolute top-4 right-4 text-[#9a8674] hover:text-[var(--color-ink)] z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="brand-mark w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white font-display text-xl font-bold">滷</div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink)] tracking-wide">歡迎光臨</h2>
            <p className="text-sm text-[#7a6555] mt-1.5">登入後即可訂購、收藏喜歡的商品</p>
          </div>

          <div className="flex bg-[#f3ebe1] p-1 rounded-xl mb-5">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === m ? 'bg-white text-[var(--color-copper)]' : 'text-[#7a6555]'}`}>
                {m === 'login' ? '登入' : '註冊'}
              </button>
            ))}
          </div>

          {error && <div className="bg-[#fdf2ef] text-[#b5452c] text-sm p-3 rounded-xl mb-4 border border-[#f0d5ce]">{error}</div>}

          <form onSubmit={handleEmail} className="space-y-3 mb-5">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="電子郵件"
              className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none" />
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼"
                className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a8674]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'register' && (
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次確認密碼"
                className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none" />
            )}
            {mode === 'login' && (
              <button type="button" onClick={() => email && resetPassword(email).then(() => setError('重設密碼信件已寄出')).catch(() => setError('重設密碼失敗'))}
                className="text-xs text-[var(--color-copper)] font-medium">忘記密碼？</button>
            )}
            <button type="submit" disabled={loading}
              className="w-full btn-copper font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />處理中...</> : mode === 'login' ? '登入' : '註冊帳號'}
            </button>
          </form>

          <div className="relative flex items-center py-2 mb-4">
            <div className="flex-grow border-t border-[#eadfce]" />
            <span className="mx-3 text-[#9a8674] text-xs">快速登入</span>
            <div className="flex-grow border-t border-[#eadfce]" />
          </div>

          <div className="space-y-2">
            <button type="button" disabled={loading} onClick={() => handleProvider('Google', googleSignIn)}
              className="w-full flex items-center justify-center gap-2 border border-[#e8d9c8] hover:bg-[#faf6f1] py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google 登入
            </button>
            <button type="button" disabled={loading} onClick={() => handleProvider('Facebook', facebookSignIn)}
              className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              Facebook 登入
            </button>
            <button type="button" disabled={loading} onClick={() => handleProvider('Yahoo', yahooSignIn)}
              className="w-full flex items-center justify-center gap-2 bg-[#5c3d2e] hover:bg-[#4a3124] text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              Yahoo 登入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
