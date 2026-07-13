import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { mergeSettings, setSettingsCache } from '../../lib/useSettings';
import { getSettingsSnapshot } from '../../lib/settingsCache';
import { PAGE_TEXT_FIELDS } from '../../lib/pageTexts';
import { Check, Loader2, Mail, ChevronUp, ChevronDown, Plus, Trash2, Image, X, Type, ExternalLink, Music, Send, GripVertical, ImagePlus } from 'lucide-react';
import { testOrderEmail } from '../../lib/orderNotify';
import { CarouselSlide } from '../../types';
import { fileToBase64Hero } from '../../lib/imageUpload';

export default function AdminSettings() {
  const [settings, setSettings] = useState(() => getSettingsSnapshot());
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSubCat, setNewSubCat] = useState<Record<string, string>>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState('');
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState('');

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

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const arr = [...(settings.categoryOrder || [])];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setSettings({ ...settings, categoryOrder: arr });
  };

  const reorderCategory = (from: number, to: number) => {
    const arr = [...(settings.categoryOrder || [])];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setSettings({ ...settings, categoryOrder: arr });
  };

  const addSubCategory = (cat: string) => {
    const name = (newSubCat[cat] || '').trim();
    if (!name) return;
    const subs = { ...settings.subCategories };
    subs[cat] = [...(subs[cat] || []), name];
    setSettings({ ...settings, subCategories: subs });
    setNewSubCat({ ...newSubCat, [cat]: '' });
  };

  const removeSubCategory = (cat: string, sub: string) => {
    const subs = { ...settings.subCategories };
    subs[cat] = (subs[cat] || []).filter((s) => s !== sub);
    setSettings({ ...settings, subCategories: subs });
  };

  const updateSlide = (idx: number, field: keyof CarouselSlide, val: string) => {
    const slides = [...(settings.carousel || [])];
    slides[idx] = { ...slides[idx], [field]: val };
    setSettings({ ...settings, carousel: slides });
  };

  const addSlide = () => {
    setSettings({ ...settings, carousel: [...(settings.carousel || []), { image: '', title: '', subtitle: '' }] });
  };

  const removeSlide = (idx: number) => {
    setSettings({ ...settings, carousel: (settings.carousel || []).filter((_, i) => i !== idx) });
  };

  const uploadSlideImage = async (idx: number, file: File) => {
    setUploadErr('');
    try {
      const base64 = await fileToBase64Hero(file);
      updateSlide(idx, 'image', base64);
    } catch (e: any) {
      setUploadErr(e.message || '上傳失敗');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-stone-900 mb-1">網站設定</h1>
        <p className="text-sm text-stone-500">管理店家資訊、前台菜單文案、分類排序與 Email 通知</p>
        <button type="button" onClick={() => window.open(`${window.location.origin}/`, '_blank', 'noopener,noreferrer')}
          className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 hover:underline mt-2">
          <ExternalLink className="w-4 h-4" />預覽前台菜單（新分頁，免重新登入）
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-bold text-stone-800">店家資訊</h3>
        {[
          { key: 'storeName', label: '店家名稱' },
          { key: 'storePhone', label: '聯絡電話' },
          { key: 'storeAddress', label: '店家地址' },
          { key: 'lineId', label: 'LINE ID' },
          { key: 'lineUrl', label: 'LINE 連結' },
          { key: 'facebookUrl', label: 'Facebook 連結（選填）' },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-bold text-stone-700 mb-1">{f.label}</label>
            <input value={(settings as any)[f.key] || ''}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">店家簡介</label>
          <textarea value={settings.storeDescription}
            onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm h-16 resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">頁尾文字</label>
          <textarea value={settings.footerText || ''}
            onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm h-16 resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">前台文字大小：{settings.textScale || 110}%</label>
          <input type="range" min="90" max="150" step="5" value={settings.textScale || 110}
            onChange={(e) => setSettings({ ...settings, textScale: Number(e.target.value) })}
            className="w-full accent-amber-600" />
          <p className="text-xs text-stone-400 mt-1">調整全站字體大小（建議 110%～130%）</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2"><Music className="w-4 h-4 text-amber-600" />背景音樂</h3>
        <p className="text-xs text-stone-500">貼上 MP3 音樂網址，前台左下角會出現播放按鈕（訪客需點擊才會播放）</p>
        <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer">
          <input type="checkbox" checked={!!settings.bgMusicEnabled}
            onChange={(e) => setSettings({ ...settings, bgMusicEnabled: e.target.checked })}
            className="rounded" />
          啟用背景音樂
        </label>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">音樂檔案網址（MP3）</label>
          <input value={settings.bgMusicUrl || ''}
            onChange={(e) => setSettings({ ...settings, bgMusicUrl: e.target.value })}
            placeholder="https://example.com/music.mp3"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">音量：{settings.bgMusicVolume ?? 40}%</label>
          <input type="range" min="10" max="100" step="5" value={settings.bgMusicVolume ?? 40}
            onChange={(e) => setSettings({ ...settings, bgMusicVolume: Number(e.target.value) })}
            className="w-full accent-amber-600" />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2"><Type className="w-4 h-4 text-amber-600" />前台菜單與文案管理</h3>
        <p className="text-xs text-stone-500">以下文字會顯示在前台每個頁面，可依需求自由修改</p>
        {['導覽列', '菜單頁', '購物車', '訂單頁', '頁尾', '會員註冊'].map((group) => (
          <div key={group} className="bg-stone-50 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-stone-800 text-sm">{group}</h4>
            {PAGE_TEXT_FIELDS.filter((f) => f.group === group).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-stone-600 mb-1">{f.label}</label>
                <input value={settings.pageTexts?.[f.key] || ''}
                  onChange={(e) => setSettings({ ...settings, pageTexts: { ...settings.pageTexts, [f.key]: e.target.value } })}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2"><Image className="w-4 h-4 text-amber-600" />首頁輪播幻燈片</h3>
        <p className="text-xs text-stone-500">可直接上傳照片，或貼圖片網址（建議至「前台管理」操作）</p>
        {uploadErr && <p className="text-xs text-red-600 font-bold">{uploadErr}</p>}
        {(settings.carousel || []).map((slide, idx) => (
          <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-2 relative">
            <button type="button" onClick={() => removeSlide(idx)} className="absolute top-2 right-2 text-stone-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            {slide.image && <img src={slide.image} alt="" className="w-full h-32 object-cover rounded-lg border border-stone-200" />}
            <input placeholder="標題" value={slide.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm" />
            <input placeholder="副標題" value={slide.subtitle} onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm" />
            <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer">
              <ImagePlus className="w-4 h-4" />上傳照片
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadSlideImage(idx, e.target.files[0])} />
            </label>
            <input placeholder="或貼上圖片網址（選填）" value={slide.image?.startsWith('data:') ? '' : (slide.image || '')} onChange={(e) => updateSlide(idx, 'image', e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm font-mono text-xs" />
          </div>
        ))}
        <button type="button" onClick={addSlide} className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700">
          <Plus className="w-4 h-4" />新增輪播頁
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-bold text-stone-800">分類排序與小類管理</h3>
        <p className="text-xs text-stone-500">拖曳 ≡ 調整大類順序（也可至「前台管理」頁面操作）</p>
        {(settings.categoryOrder || []).map((cat, idx) => (
          <div key={cat} draggable onDragStart={() => setDragCat(cat)} onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragCat) return;
              const from = (settings.categoryOrder || []).indexOf(dragCat);
              if (from >= 0 && from !== idx) reorderCategory(from, idx);
              setDragCat(null);
            }}
            className={`bg-stone-50 rounded-xl p-4 ${dragCat === cat ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <GripVertical className="w-4 h-4 text-stone-300 cursor-grab shrink-0" />
              <button onClick={() => moveCategory(idx, -1)} disabled={idx === 0} className="p-1 text-stone-400 hover:text-amber-600 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => moveCategory(idx, 1)} disabled={idx === (settings.categoryOrder?.length || 0) - 1} className="p-1 text-stone-400 hover:text-amber-600 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
              <span className="font-bold text-stone-800">{cat}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(settings.subCategories?.[cat] || []).map((sub) => (
                <span key={sub} className="flex items-center gap-1 bg-white border border-stone-200 px-2 py-1 rounded-lg text-xs font-bold">
                  {sub}
                  <button onClick={() => removeSubCategory(cat, sub)} className="text-stone-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input placeholder="新增小類名稱" value={newSubCat[cat] || ''} onChange={(e) => setNewSubCat({ ...newSubCat, [cat]: e.target.value })}
                className="flex-1 bg-white border border-stone-200 rounded-lg p-2 text-sm" />
              <button onClick={() => addSubCategory(cat)} className="bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold">新增</button>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2"><Mail className="w-4 h-4 text-amber-600" />訂單 Email 通知</h3>
        <p className="text-xs text-stone-500">客戶下單後，系統會寄信給商家與客戶（含完整訂單明細），不再自動下載檔案</p>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">商家收件 Email</label>
          <input type="email" value={settings.adminEmail}
            onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">Web3Forms 金鑰（免費 Email 服務）</label>
          <input value={settings.web3formsAccessKey}
            onChange={(e) => setSettings({ ...settings, web3formsAccessKey: e.target.value })}
            placeholder="到 web3forms.com 免費申請 Access Key"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          <p className="text-[11px] text-stone-400 mt-1.5">
            申請步驟：前往 <a href="https://web3forms.com" target="_blank" rel="noreferrer" className="text-amber-600 underline">web3forms.com</a> → 輸入商家 Email → 取得 Access Key → <strong>到信箱點擊啟用連結</strong> → 貼到上方 → 儲存設定
          </p>
          <p className="text-[11px] text-amber-700 mt-1">
            免費版只會寄信到「申請金鑰時填的 Email」，不會另外寄給客戶。客戶可在「我的訂單」查看。
          </p>
          <button type="button" onClick={sendTestEmail} disabled={testingEmail}
            className="mt-3 inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50">
            {testingEmail ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />寄送中...</> : <><Send className="w-3.5 h-3.5" />寄送測試信</>}
          </button>
          {emailTestResult && (
            <p className={`text-xs mt-2 font-medium ${emailTestResult.startsWith('發送失敗') ? 'text-red-600' : 'text-emerald-700'}`}>{emailTestResult}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-1">Google 試算表 ID（選填）</label>
          <input value={settings.spreadsheetId}
            onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value })}
            placeholder="訂單自動同步至試算表"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
      </section>

      <button onClick={save} disabled={loading}
        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />儲存中...</> : saved ? <><Check className="w-4 h-4" />已儲存！</> : '儲存設定'}
      </button>
    </div>
  );
}
