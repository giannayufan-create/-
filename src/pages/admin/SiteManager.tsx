import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getSettingsSnapshot, setSettingsCache } from '../../lib/settingsCache';
import { PAGE_TEXT_FIELDS } from '../../lib/pageTexts';
import { CarouselSlide } from '../../types';
import {
  Layout, Image, Type, GripVertical, Plus, Trash2, ChevronUp, ChevronDown,
  Check, Loader2, Star, Music, Save, Eye,
} from 'lucide-react';

const SECTIONS = [
  { id: 'carousel', label: '首頁輪播', icon: Image, color: 'from-amber-500 to-orange-500' },
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

  useEffect(() => { setSettings(getSettingsSnapshot()); }, []);

  const save = async () => {
    setLoading(true);
    await setDoc(doc(db, 'settings', 'global'), { ...settings, updatedAt: new Date().toISOString() });
    setSettingsCache(settings);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[70vh]">
      {/* 左側模組清單 */}
      <aside className="lg:w-56 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-stone-900">前台管理</h1>
            <p className="text-xs text-stone-500">拖拉排序 · 即時編輯</p>
          </div>
        </div>
        <div className="space-y-2">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active === s.id ? 'bg-stone-900 text-white shadow-lg' : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white shrink-0`}>
                <s.icon className="w-4 h-4" />
              </div>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <button onClick={preview} className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-100">
            <Eye className="w-4 h-4" />預覽前台
          </button>
          <button onClick={save} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />儲存中</> : saved ? <><Check className="w-4 h-4" />已儲存</> : <><Save className="w-4 h-4" />儲存變更</>}
          </button>
        </div>
      </aside>

      {/* 右側編輯區 */}
      <div className="flex-1 bg-white rounded-2xl border border-stone-200 p-6 overflow-y-auto">
        {active === 'carousel' && (
          <div className="space-y-4">
            <h2 className="font-black text-lg text-stone-900">首頁輪播幻燈片</h2>
            <p className="text-xs text-stone-500">拖曳 ≡ 可調整順序，點 + 新增一頁</p>
            {(settings.carousel || []).map((slide, idx) => (
              <div key={idx} draggable onDragStart={() => setDragSlide(idx)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragSlide !== null && dragSlide !== idx) reorderSlides(dragSlide, idx); setDragSlide(null); }}
                className={`bg-stone-50 rounded-xl p-4 space-y-2 border border-stone-100 ${dragSlide === idx ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-stone-300 cursor-grab" />
                  <span className="text-xs font-bold text-stone-400">第 {idx + 1} 頁</span>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => reorderSlides(idx, idx - 1)} disabled={idx === 0} className="p-1 text-stone-400 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => reorderSlides(idx, idx + 1)} disabled={idx === (settings.carousel?.length || 0) - 1} className="p-1 text-stone-400 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => setSettings({ ...settings, carousel: (settings.carousel || []).filter((_, i) => i !== idx) })} className="p-1 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <input placeholder="標題" value={slide.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm font-bold" />
                <input placeholder="副標題" value={slide.subtitle} onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm" />
                <input placeholder="圖片網址（選填）" value={slide.image} onChange={(e) => updateSlide(idx, 'image', e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs font-mono" />
              </div>
            ))}
            <button onClick={() => setSettings({ ...settings, carousel: [...(settings.carousel || []), { image: '', title: '', subtitle: '' }] })}
              className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700">
              <Plus className="w-4 h-4" />新增輪播頁
            </button>
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
            <h2 className="font-black text-lg text-stone-900">分類排序</h2>
            <p className="text-xs text-stone-500">拖曳分類可改變前台菜單大類順序</p>
            {(settings.categoryOrder || []).map((cat, idx) => (
              <div key={cat} draggable onDragStart={() => setDragCat(cat)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragCat) return;
                  const from = (settings.categoryOrder || []).indexOf(dragCat);
                  const to = idx;
                  if (from >= 0 && from !== to) reorderCategory(from, to);
                  setDragCat(null);
                }}
                className={`flex items-center gap-3 bg-stone-50 rounded-xl p-4 border border-stone-100 ${dragCat === cat ? 'opacity-50' : ''}`}>
                <GripVertical className="w-5 h-5 text-stone-300 cursor-grab" />
                <span className="font-black text-stone-800 flex-1">{cat}</span>
                <span className="text-xs text-stone-400">順序 {idx + 1}</span>
                <button onClick={() => reorderCategory(idx, idx - 1)} disabled={idx === 0} className="p-1.5 text-stone-400 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => reorderCategory(idx, idx + 1)} disabled={idx === (settings.categoryOrder?.length || 0) - 1} className="p-1.5 text-stone-400 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
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
