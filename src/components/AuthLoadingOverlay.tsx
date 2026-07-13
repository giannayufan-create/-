import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';

export default function AuthLoadingOverlay() {
  const { isAuthLoading, isSigningIn, setSigningIn, setAuthLoading } = useStore();
  const [slow, setSlow] = useState(false);

  const show = isAuthLoading || isSigningIn;

  useEffect(() => {
    if (!show) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [show]);

  if (!show) return null;

  const cancel = () => {
    setSigningIn(false);
    setAuthLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="font-bold text-stone-800">{isSigningIn ? '登入中，請稍候...' : '載入中...'}</p>
        <p className="text-xs text-stone-500">
          {slow ? '連線較慢，即將完成...' : '正在驗證您的帳號'}
        </p>
        {slow && (
          <button onClick={cancel} className="text-xs text-stone-500 hover:text-stone-700 underline mt-1">
            取消等待
          </button>
        )}
      </div>
    </div>
  );
}
