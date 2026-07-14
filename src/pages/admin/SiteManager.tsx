import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getSettingsSnapshot, setSettingsCache } from '../../lib/settingsCache';
import { PAGE_TEXT_FIELDS } from '../../lib/pageTexts';
import { CarouselSlide } from '../../types';
import {
  Layout, Image, Type, GripVertical, Plus, Trash2, ChevronUp, ChevronDown,
  Check, Loader2, Star, Music, Save, Eye, ImagePlus, Scaling, Wallet, Clock, X,
} from 'lucide-react';
import { CARD_SIZE_PRESETS, CardSizeId } from '../../types';
import { fileToBase64Hero } from '../../lib/imageUpload';
import { buildDeliveryTimeSlots } from '../../lib/deliverySlots';

const SECTIONS = [
  { id: 'carousel', label: '首頁輪播', icon: Image, color: 'from-amber-500 to-orange-500' },
  { id: 'sizes', label: '卡片尺寸', icon: Scaling, color: 'from-rose-500 to-orange-600' },
  { id: 'checkout', label: '結帳／配送', icon: Wallet, color: 'from-cyan-500 to-blue-600' },
  { id: 'hours', label: '營業時段', icon: Clock, color: 'from-orange-500 to-amber-600' },
  { id: 'texts', label: '前台文案', icon: Type, color: 'from-blue-500 to-indigo-500' },
  { id: 'categories', label: '分類排序', icon: Layout, color: 'from-emerald-500 to-teal-500' },
  { id: 'store', label: '店家資訊', icon: Star, color: 'from-purple-500 to-pink-500' },
  { id: 'music', label: '背景音樂', icon: Music, color: 'from-stone-600 to-stone-800' },
];

export default function SiteManager() {
  const [settings, setSettings] = useState(() => getSettingsSnapshot());
  const [active, setActive] = useState('carousel');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [dragSlide, setDragSlide] = useState<number | null>(null);
  const [uploadErr, setUploadErr] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [newSubCat, setNewSubCat] = useState<Record<string, string>>({});

  useEffect(() => { setSettings(getSettingsSnapshot()); }, []);

  const save = async () => {
    setLoading(true);
    setSaveErr('');
    try {
      const payload = JSON.stringify(settings);
      if (payload.length > 900_000) {
        throw new Error('資料太大（輪播圖過多或過大）。請減少張數或改用較小照片後再儲存');
      }
      await setDoc(doc(db, 'settings', 'global'), { ...settings, updatedAt: new Date().toISOString() });
      setSettingsCache(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      const msg = e?.message || '儲存失敗';
      if (String(msg).includes('exceeds') || String(msg).includes('too large') || e?.code === 'invalid-argument') {
        setSaveErr('儲存失敗：輪播圖片太大。請改傳較小的照片後再按儲存');
      } else {
        setSaveErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadSlideImage = async (idx: number, file: File) => {
    setUploadErr('');
    try {
      const base64 = await fileToBase64Hero(file);
      updateSlide(idx, 'image', base64);
      setUploadErr('已加入預覽，請記得按左側「儲存變更」');
    } catch (e: any) {
      setUploadErr(e.message || '上傳失敗');
    }
  };

  const updateSlide = (idx: number, field: keyof CarouselSlide, val: string) => {
    const slides = [...(settings.carousel || [])];
    slides[idx] = { ...slides[idx], [field]: val };
    setSettings({ ...settings, carousel: slides });
  };

  const reorderSlides = (from: number, to: number) => {
    const slides = [...(settings.carousel || [])];
    const [moved] = slides.splice(from, 1);
    slides.splice(to, 0, moved);
    setSettings({ ...settings, carousel: slides });
  };

  const reorderCategory = (from: number, to: number) => {
    const arr = [...(settings.categoryOrder || [])];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setSettings({ ...settings, categoryOrder: arr });
  };

  const preview = () => window.open(`${window.location.origin}/`, '_blank', 'noopener,noreferrer');

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

  const slotPreview = buildDeliveryTimeSlots(settings);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[70vh]">
      <aside className="lg:w-56 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">店面設定</h1>
            <p className="text-xs text-[#7a6555]">輪播 · 結帳 · 營業時段</p>
          </div>
        </div>
        <div className="space-y-2">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active === s.id ? 'bg-[var(--color-ink)] text-white shadow-lg' : 'surface-warm text-[#6b5648] hover:border-[var(--color-copper)]/40'}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white shrink-0`}>
                <s.icon className="w-4 h-4" />
              </div>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <button type="button" onClick={preview} className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-100">
            <Eye className="w-4 h-4" />預覽前台
          </button>
          <button type="button" onClick={save} disabled={loading}
            className="w-full flex items-center justify-center gap-2 btn-copper py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />儲存中</> : saved ? <><Check className="w-4 h-4" />已儲存</> : <><Save className="w-4 h-4" />儲存變更</>}
          </button>
          {saveErr && <p className="text-[11px] text-red-600 font-bold leading-snug">{saveErr}</p>}
        </div>
      </aside>

      <div className="flex-1 surface-warm rounded-2xl p-6 overflow-y-auto">
        {active === 'carousel' && (
          <div className="space-y-4">
            <h2 className="font-black text-lg text-stone-900">首頁輪播幻燈片</h2>
            <p className="text-xs text-stone-500">點「上傳照片」選圖 → 左側按「儲存變更」才會上線。建議每張小於 2MB。</p>
            {uploadErr && <p className="text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{uploadErr}</p>}
            {saveErr && <p className="text-xs text-red-600 font-bold">{saveErr}</p>}
            {(settings.carousel || []).map((slide, idx) => (
              <div key={idx} draggable onDragStart={() => setDragSlide(idx)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragSlide !== null && dragSlide !== idx) reorderSlides(dragSlide, idx); setDragSlide(null); }}
                className={`bg-stone-50 rounded-xl p-4 space-y-2 border border-stone-100 ${dragSlide === idx ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-stone-300 cursor-grab" />
                  <span className="text-xs font-bold text-stone-400">第 {idx + 1} 頁</span>
                  <div className="ml-auto flex gap-1">
                    <button type="button" onClick={() => reorderSlides(idx, idx - 1)} disabled={idx === 0} className="p-1 text-stone-400 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => reorderSlides(idx, idx + 1)} disabled={idx === (settings.carousel?.length || 0) - 1} className="p-1 text-stone-400 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setSettings({ ...settings, carousel: (settings.carousel || []).filter((_, i) => i !== idx) })} className="p-1 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {slide.image && (
                  <img src={slide.image} alt="" className="w-full h-36 object-cover rounded-xl border border-stone-200" />
                )}
                <input placeholder="標題" value={slide.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm font-bold" />
                <input placeholder="副標題" value={slide.subtitle} onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm" />
                <label className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer w-fit">
                  <ImagePlus className="w-4 h-4" />上傳照片
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadSlideImage(idx, e.target.files[0])} />
                </label>
                <input placeholder="或貼上圖片網址（選填）" value={slide.image?.startsWith('data:') ? '' : (slide.image || '')}
                  onChange={(e) => updateSlide(idx, 'image', e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs font-mono" />
                {slide.image?.startsWith('data:') && (
                  <button type="button" onClick={() => updateSlide(idx, 'image', '')} className="text-xs text-red-600 font-bold">清除已上傳圖片</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setSettings({ ...settings, carousel: [...(settings.carousel || []), { image: '', title: '', subtitle: '' }] })}
              className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700">
              <Plus className="w-4 h-4" />新增輪播頁
            </button>
          </div>
        )}

        {active === 'sizes' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-black text-lg text-stone-900">菜單商品卡片尺寸</h2>
              <p className="text-xs text-stone-500 mt-1">共 4 種尺寸，依「大類」統一套用，不用一個一個商品調</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CARD_SIZE_PRESETS.map((p) => (
                <div key={p.id} className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-center">
                  <div className="mx-auto bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg mb-2" style={{ height: Math.round(p.imageHeight / 3), width: '100%' }} />
                  <p className="font-black text-stone-800">{p.id} · {p.label}</p>
                  <p className="text-[10px] text-stone-400">圖高 {p.imageHeight}px</p>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">預設尺寸（未指定大類時）</label>
              <select
                value={settings.defaultCardSize || 'M'}
                onChange={(e) => setSettings({ ...settings, defaultCardSize: e.target.value as CardSizeId })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold"
              >
                {CARD_SIZE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.label}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-stone-800">各大類尺寸</p>
              {(settings.categoryOrder || []).map((cat) => (
                <div key={cat} className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                  <span className="font-bold text-stone-800 w-24 shrink-0">{cat}</span>
                  <select
                    value={settings.categoryCardSizes?.[cat] || settings.defaultCardSize || 'M'}
                    onChange={(e) => setSettings({
                      ...settings,
                      categoryCardSizes: { ...(settings.categoryCardSizes || {}), [cat]: e.target.value as CardSizeId },
                    })}
                    className="flex-1 bg-white border border-stone-200 rounded-lg p-2 text-sm font-bold"
                  >
                    {CARD_SIZE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.label}（圖高 {p.imageHeight}px）</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'checkout' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-black text-lg text-stone-900">結帳方式設定</h2>
              <p className="text-xs text-stone-500 mt-1">開關付款／配送方式，未開放的選項前台會顯示「尚未開放」</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 space-y-3 border border-stone-100">
              <p className="font-bold text-stone-800 text-sm">付款方式</p>
              {[
                { key: 'paymentCashEnabled' as const, label: '現金', hint: '建議維持開啟' },
                { key: 'paymentTransferEnabled' as const, label: '轉帳', hint: '開放後前台可選' },
                { key: 'paymentCreditEnabled' as const, label: '信用卡', hint: '開放後前台可選（尚未串金流）' },
              ].map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 cursor-pointer">
                  <div>
                    <p className="font-bold text-stone-800 text-sm">{f.label}</p>
                    <p className="text-[11px] text-stone-400">{f.hint}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!(settings as any)[f.key]}
                    onChange={(e) => setSettings({ ...settings, [f.key]: e.target.checked })}
                    className="w-5 h-5 accent-amber-600"
                  />
                </label>
              ))}
              {!settings.paymentTransferEnabled && !settings.paymentCreditEnabled && settings.paymentCashEnabled && (
                <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  目前前台會標註：目前只接受現金
                </p>
              )}
            </div>
            <div className="bg-[#faf6f1] rounded-xl p-4 space-y-3 border border-[#e8d9c8]">
              <p className="font-bold text-[var(--color-ink)] text-sm">配送方式</p>
              <label className="flex items-center justify-between gap-3 bg-white rounded-xl border border-[#e8d9c8] px-4 py-3 cursor-pointer">
                <div>
                  <p className="font-bold text-[var(--color-ink)] text-sm">本人親自送達</p>
                  <p className="text-[11px] text-[#9a8674]">目前僅此一種</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.deliveryPersonalEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, deliveryPersonalEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[var(--color-copper)]"
                />
              </label>
            </div>
            <div className="bg-[#faf6f1] rounded-xl p-4 space-y-3 border border-[#e8d9c8]">
              <p className="font-bold text-[var(--color-ink)] text-sm">最低消費金額</p>
              <p className="text-[11px] text-[#9a8674]">設 0 表示不限制。結帳時未達金額會阻擋送出。</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#7a6555]">$</span>
                <input
                  type="number"
                  min={0}
                  value={settings.minOrderAmount ?? 0}
                  onChange={(e) => setSettings({ ...settings, minOrderAmount: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-40 bg-white border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {active === 'hours' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display font-bold text-lg text-[var(--color-ink)]">營業／配送時段</h2>
              <p className="text-xs text-[#7a6555] mt-1">控制前台可選的配送日期與時段</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">配送開始（時）</label>
                <input type="number" min={0} max={23} value={settings.deliveryStartHour ?? 9}
                  onChange={(e) => setSettings({ ...settings, deliveryStartHour: Number(e.target.value) })}
                  className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">配送結束（時）</label>
                <input type="number" min={0} max={23} value={settings.deliveryEndHour ?? 20}
                  onChange={(e) => setSettings({ ...settings, deliveryEndHour: Number(e.target.value) })}
                  className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">時段間隔</label>
                <select value={settings.deliverySlotMinutes ?? 30}
                  onChange={(e) => setSettings({ ...settings, deliverySlotMinutes: Number(e.target.value) })}
                  className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold">
                  <option value={30}>每 30 分鐘</option>
                  <option value={60}>每 60 分鐘</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">可預約天數</label>
                <input type="number" min={1} max={90} value={settings.deliveryMaxDays ?? 30}
                  onChange={(e) => setSettings({ ...settings, deliveryMaxDays: Math.max(1, Number(e.target.value) || 30) })}
                  className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-[var(--color-ink)] mb-1">最早可訂（提前天數）</label>
                <input type="number" min={0} max={14} value={settings.deliveryLeadDays ?? 0}
                  onChange={(e) => setSettings({ ...settings, deliveryLeadDays: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold" />
                <p className="text-[11px] text-[#9a8674] mt-1">0 = 今天可訂；1 = 最早明天</p>
              </div>
            </div>
            <div className="bg-[#faf6f1] rounded-xl p-4 border border-[#e8d9c8]">
              <p className="text-xs font-bold text-[#7a6555] mb-2">時段預覽（共 {slotPreview.length} 個）</p>
              <div className="flex flex-wrap gap-1.5">
                {slotPreview.map((t) => (
                  <span key={t} className="text-[11px] font-bold bg-white border border-[#e8d9c8] px-2 py-1 rounded-lg text-[var(--color-ink)]">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {active === 'texts' && (
          <div className="space-y-4">
            <h2 className="font-black text-lg text-stone-900">前台文案</h2>
            {['導覽列', '菜單頁', '購物車', '頁尾'].map((group) => (
              <div key={group} className="bg-stone-50 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-stone-800 text-sm">{group}</h3>
                {PAGE_TEXT_FIELDS.filter((f) => f.group === group).map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-stone-500 mb-1">{f.label}</label>
                    <input value={settings.pageTexts?.[f.key] || ''}
                      onChange={(e) => setSettings({ ...settings, pageTexts: { ...settings.pageTexts, [f.key]: e.target.value } })}
                      className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {active === 'categories' && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-[var(--color-ink)]">分類排序與小類</h2>
            <p className="text-xs text-[#7a6555]">拖曳調整大類順序，並管理各大小類名稱</p>
            {(settings.categoryOrder || []).map((cat, idx) => (
              <div key={cat} draggable onDragStart={() => setDragCat(cat)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragCat) return;
                  const from = (settings.categoryOrder || []).indexOf(dragCat);
                  const to = idx;
                  if (from >= 0 && from !== to) reorderCategory(from, to);
                  setDragCat(null);
                }}
                className={`bg-[#faf6f1] rounded-xl p-4 border border-[#e8d9c8] ${dragCat === cat ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <GripVertical className="w-5 h-5 text-[#cbb9a5] cursor-grab" />
                  <span className="font-bold text-[var(--color-ink)] flex-1">{cat}</span>
                  <span className="text-xs text-[#9a8674]">順序 {idx + 1}</span>
                  <button type="button" onClick={() => reorderCategory(idx, idx - 1)} disabled={idx === 0} className="p-1.5 text-[#9a8674] disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => reorderCategory(idx, idx + 1)} disabled={idx === (settings.categoryOrder?.length || 0) - 1} className="p-1.5 text-[#9a8674] disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(settings.subCategories?.[cat] || []).map((sub) => (
                    <span key={sub} className="flex items-center gap-1 bg-white border border-[#e8d9c8] px-2 py-1 rounded-lg text-xs font-bold">
                      {sub}
                      <button type="button" onClick={() => removeSubCategory(cat, sub)} className="text-[#9a8674] hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input placeholder="新增小類名稱" value={newSubCat[cat] || ''} onChange={(e) => setNewSubCat({ ...newSubCat, [cat]: e.target.value })}
                    className="flex-1 bg-white border border-[#e8d9c8] rounded-lg p-2 text-sm" />
                  <button type="button" onClick={() => addSubCategory(cat)} className="btn-copper px-3 py-2 rounded-lg text-xs font-bold">新增</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {active === 'store' && (
          <div className="space-y-4">
            <h2 className="font-black text-lg text-stone-900">店家資訊</h2>
            {[
              { key: 'storeName', label: '店家名稱' },
              { key: 'storePhone', label: '聯絡電話' },
              { key: 'storeAddress', label: '店家地址' },
              { key: 'lineId', label: 'LINE ID' },
              { key: 'lineUrl', label: 'LINE 連結' },
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
              <textarea value={settings.storeDescription || ''} onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm h-20 resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">文字大小：{settings.textScale || 110}%</label>
              <input type="range" min="90" max="150" step="5" value={settings.textScale || 110}
                onChange={(e) => setSettings({ ...settings, textScale: Number(e.target.value) })}
                className="w-full accent-amber-600" />
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">登入方式</p>
              <p>目前支援信箱註冊／登入，以及 Google、Facebook、Yahoo。聯絡用 LINE 連結請在上方填寫。</p>
            </div>
          </div>
        )}

        {active === 'music' && (
          <div className="space-y-4">
            <h2 className="font-black text-lg text-stone-900">背景音樂</h2>
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={!!settings.bgMusicEnabled} onChange={(e) => setSettings({ ...settings, bgMusicEnabled: e.target.checked })} className="rounded" />
              啟用背景音樂
            </label>
            <input value={settings.bgMusicUrl || ''} onChange={(e) => setSettings({ ...settings, bgMusicUrl: e.target.value })}
              placeholder="MP3 網址" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-mono" />
            <div>
              <label className="text-sm font-bold">音量 {settings.bgMusicVolume ?? 40}%</label>
              <input type="range" min="10" max="100" step="5" value={settings.bgMusicVolume ?? 40}
                onChange={(e) => setSettings({ ...settings, bgMusicVolume: Number(e.target.value) })} className="w-full accent-amber-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
