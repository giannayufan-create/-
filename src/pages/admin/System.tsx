import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { setSettingsCache } from '../../lib/useSettings';
import { getSettingsSnapshot } from '../../lib/settingsCache';
import { Check, Loader2, Mail, Send } from 'lucide-react';
import { testOrderEmail } from '../../lib/orderNotify';

export default function AdminSystem() {
  const [settings, setSettings] = useState(() => getSettingsSnapshot());
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState('');

  useEffect(() => {
    setSettings(getSettingsSnapshot());
  }, []);

  const save = async () => {
    setLoading(true);
    await setDoc(doc(db, 'settings', 'global'), { ...settings, updatedAt: new Date().toISOString() });
    setSettingsCache(settings);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const sendTestEmail = async () => {
    const key = settings.web3formsAccessKey?.trim();
    if (!key) {
      setEmailTestResult('請先填入 Web3Forms 金鑰');
      return;
    }
    setTestingEmail(true);
    setEmailTestResult('');
    try {
      await testOrderEmail(key, settings.adminEmail || 'ko520940@gmail.com', settings.storeName || '滷味小哥');
      setEmailTestResult(`測試信已寄出！請檢查申請金鑰時使用的信箱（建議 ${settings.adminEmail || 'ko520940@gmail.com'}），含垃圾郵件匣。`);
    } catch (e: any) {
      setEmailTestResult(`發送失敗：${e?.message || '未知錯誤'}。請確認金鑰正確，且已在 web3forms.com 點擊啟用信。`);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] mb-1">系統整合</h1>
        <p className="text-sm text-[#7a6555]">訂單通知 Email、試算表同步。店面外觀請到「店面設定」。</p>
      </div>

      <section className="surface-warm rounded-2xl p-6 space-y-4">
        <h3 className="font-display font-bold text-[var(--color-ink)] flex items-center gap-2">
          <Mail className="w-4 h-4 text-[var(--color-copper)]" />訂單 Email 通知
        </h3>
        <p className="text-xs text-[#7a6555]">客戶下單後，系統會寄信給商家（含完整訂單明細）</p>

        <div>
          <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">商家收件 Email</label>
          <input
            type="email"
            value={settings.adminEmail}
            onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">Web3Forms 金鑰（免費 Email 服務）</label>
          <input
            value={settings.web3formsAccessKey}
            onChange={(e) => setSettings({ ...settings, web3formsAccessKey: e.target.value })}
            placeholder="到 web3forms.com 免費申請 Access Key"
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none"
          />
          <p className="text-[11px] text-[#9a8674] mt-1.5">
            申請：前往{' '}
            <a href="https://web3forms.com" target="_blank" rel="noreferrer" className="text-[var(--color-copper)] underline">
              web3forms.com
            </a>{' '}
            → 輸入商家 Email → 取得 Access Key → 到信箱點擊啟用 → 貼到上方
          </p>
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testingEmail}
            className="mt-3 inline-flex items-center gap-2 bg-[var(--color-ink)] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {testingEmail ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                寄送中...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                寄送測試信
              </>
            )}
          </button>
          {emailTestResult && (
            <p className={`text-xs mt-2 font-medium ${emailTestResult.startsWith('發送失敗') ? 'text-red-600' : 'text-emerald-700'}`}>
              {emailTestResult}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">Google 試算表 ID（選填）</label>
          <input
            value={settings.spreadsheetId}
            onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value })}
            placeholder="訂單自動同步至試算表"
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none"
          />
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-copper font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            儲存中...
          </>
        ) : saved ? (
          <>
            <Check className="w-4 h-4" />
            已儲存！
          </>
        ) : (
          '儲存設定'
        )}
      </button>
    </div>
  );
}
