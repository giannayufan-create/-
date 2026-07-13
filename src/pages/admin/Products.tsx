import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getSettingsSnapshot } from '../../lib/settingsCache';
import { DEFAULT_SETTINGS, SAMPLE_PRODUCTS } from '../../lib/seed';
import { Plus, Trash2, Edit2, Check, X, RefreshCw, GripVertical, Star, ChevronUp, ChevronDown, ImagePlus, Package } from 'lucide-react';
import { MAIN_CATEGORIES } from '../../types';
import { fileToBase64 } from '../../lib/imageUpload';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [settings] = useState(() => ({ ...DEFAULT_SETTINGS, ...getSettingsSnapshot() }));
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState({ name: '', description: '', price: 0, stock: 0, subCategory: '', isFeatured: false, imageBase64: '' });
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 0, category: '火鍋料', subCategory: '', isFeatured: false, imageBase64: '' });
  const [imgError, setImgError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('全部');
  const [quickStockId, setQuickStockId] = useState<string | null>(null);
  const [quickStock, setQuickStock] = useState(0);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'products'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setProducts(docs);
    });
    return () => u1();
  }, []);

  const cats = settings.categoryOrder?.length ? settings.categoryOrder : MAIN_CATEGORIES;
  const subCats = settings.subCategories || {};
  const visible = catFilter === '全部' ? products : products.filter((p) => p.category === catFilter);

  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.price <= 0) return;
    setLoading(true);
    const now = new Date().toISOString();
    const maxOrder = products.reduce((m, p) => Math.max(m, p.sortOrder || 0), 0);
    await addDoc(collection(db, 'products'), {
      ...form, name: form.name.trim(), sortOrder: maxOrder + 1, salesCount: 0, createdAt: now, updatedAt: now,
    });
    setForm({ name: '', description: '', price: 0, stock: 0, category: '火鍋料', subCategory: '', isFeatured: false, imageBase64: '' });
    setLoading(false);
    flash('商品已新增');
  };

  const seedProducts = async () => {
    setSeeding(true);
    const now = new Date().toISOString();
    for (const p of SAMPLE_PRODUCTS) await addDoc(collection(db, 'products'), { ...p, salesCount: 0, createdAt: now, updatedAt: now });
    setSeeding(false);
  };

  const moveProduct = async (id: string, dir: -1 | 1) => {
    const idx = products.findIndex((p) => p.id === id);
    const target = products[idx + dir];
    if (!target) return;
    const now = new Date().toISOString();
    await Promise.all([
      updateDoc(doc(db, 'products', id), { sortOrder: target.sortOrder || idx + dir, updatedAt: now }),
      updateDoc(doc(db, 'products', target.id), { sortOrder: products[idx].sortOrder || idx, updatedAt: now }),
    ]);
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = products.findIndex((p) => p.id === dragId);
    const to = products.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...products];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const now = new Date().toISOString();
    await Promise.all(reordered.map((p, i) => updateDoc(doc(db, 'products', p.id), { sortOrder: i + 1, updatedAt: now })));
    setDragId(null);
  };

  const handleImage = async (file: File, target: 'form' | 'edit') => {
    setImgError('');
    try {
      const base64 = await fileToBase64(file);
      if (target === 'form') setForm((f) => ({ ...f, imageBase64: base64 }));
      else setEditVal((e) => ({ ...e, imageBase64: base64 }));
    } catch (e: any) {
      setImgError(e.message || '圖片上傳失敗');
    }
  };

  const saveQuickStock = async (id: string) => {
    const stock = Math.max(0, Math.floor(Number(quickStock)) || 0);
    await updateDoc(doc(db, 'products', id), { stock, updatedAt: new Date().toISOString() });
    setQuickStockId(null);
    flash(`庫存已更新為 ${stock}`);
  };

  const adjustStock = async (id: string, current: number, delta: number) => {
    const stock = Math.max(0, current + delta);
    await updateDoc(doc(db, 'products', id), { stock, updatedAt: new Date().toISOString() });
    flash(`庫存已更新為 ${stock}`);
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, 'products', id), {
      name: editVal.name.trim() || '未命名商品',
      description: editVal.description,
      price: Number(editVal.price) || 0,
      stock: Math.max(0, Number(editVal.stock) || 0),
      subCategory: editVal.subCategory,
      isFeatured: editVal.isFeatured,
      imageBase64: editVal.imageBase64,
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
    flash('商品已儲存');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">商品管理</h1>
          <p className="text-sm text-[#7a6555]">拖拉排序、修改庫存／價格／名稱，直接上傳照片</p>
        </div>
        <button onClick={seedProducts} disabled={seeding}
          className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
          {seeding ? '匯入中...' : '一鍵匯入範例商品'}
        </button>
      </div>

      {savedMsg && (
        <div className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold">
          {savedMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={addProduct} className="surface-warm rounded-2xl p-5 space-y-3 h-fit sticky top-4">
          <h3 className="font-bold text-[var(--color-ink)] flex items-center gap-2"><Plus className="w-4 h-4 text-[var(--color-copper)]" />新增商品</h3>
          <input required placeholder="商品名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
          <textarea placeholder="商品描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })}
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm font-bold">
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
            className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm">
            <option value="">選擇小類（選填）</option>
            {(subCats[form.category] || []).map((sc) => <option key={sc}>{sc}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" min="1" placeholder="價格" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm" />
            <input required type="number" min="0" placeholder="庫存" value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              className="bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-[#5c4a3d] cursor-pointer">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
            <Star className="w-4 h-4 text-yellow-500" />設為明星商品
          </label>
          <div>
            <label className="block text-sm font-bold text-[#5c4a3d] mb-1 flex items-center gap-1"><ImagePlus className="w-4 h-4" />商品照片</label>
            {form.imageBase64 && <img src={form.imageBase64} alt="" className="w-full h-28 object-cover rounded-xl mb-2 border border-[#eadfce]" />}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], 'form')}
              className="w-full text-xs text-[#7a6555] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-bold" />
            {imgError && <p className="text-xs text-red-600 mt-1">{imgError}</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full btn-copper font-bold py-3 rounded-xl text-sm disabled:opacity-50">
            {loading ? '新增中...' : '確認新增'}
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            {['全部', ...cats].map((c) => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`chip px-4 py-2 text-xs font-bold border ${catFilter === c ? 'chip-active' : 'bg-white border-[#e8d9c8] text-[#6b5648]'}`}>
                {c}{c !== '全部' && ` (${products.filter((p) => p.category === c).length})`}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9a8674]">拖曳 ≡ 調整順序 · 點庫存可快速修改 · 鉛筆可完整編輯</p>

          {visible.map((p, idx) => (
            <div key={p.id} draggable={editing !== p.id} onDragStart={() => setDragId(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(p.id)}
              className={`surface-warm rounded-xl p-3 ${dragId === p.id ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-[#c4b0a0] cursor-grab shrink-0" />
                {p.imageBase64 ? <img src={p.imageBase64} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : (
                  <div className="w-11 h-11 rounded-lg bg-[#f3ebe1] flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-[var(--color-copper)]" /></div>
                )}
                <span className="text-xs text-[#9a8674] w-5 shrink-0">{idx + 1}</span>

                {editing === p.id ? (
                  <div className="flex-1 space-y-2">
                    <input value={editVal.name} onChange={(e) => setEditVal({ ...editVal, name: e.target.value })}
                      className="w-full bg-white border border-[#e8d9c8] rounded-lg p-2 text-sm font-bold" placeholder="商品名稱" />
                    <textarea value={editVal.description} onChange={(e) => setEditVal({ ...editVal, description: e.target.value })}
                      className="w-full bg-white border border-[#e8d9c8] rounded-lg p-2 text-xs h-14 resize-none" placeholder="商品描述" />
                    <div className="flex flex-wrap gap-2">
                      <label className="text-[10px] font-bold text-[#7a6555]">價格
                        <input type="number" value={editVal.price} onChange={(e) => setEditVal({ ...editVal, price: Number(e.target.value) })}
                          className="block w-24 bg-white border border-[#e8d9c8] rounded-lg p-1.5 text-xs mt-0.5" />
                      </label>
                      <label className="text-[10px] font-bold text-[#7a6555]">庫存
                        <input type="number" min={0} value={editVal.stock} onChange={(e) => setEditVal({ ...editVal, stock: Number(e.target.value) })}
                          className="block w-24 bg-white border border-[#e8d9c8] rounded-lg p-1.5 text-xs mt-0.5" />
                      </label>
                      <label className="text-[10px] font-bold text-[#7a6555]">小類
                        <select value={editVal.subCategory} onChange={(e) => setEditVal({ ...editVal, subCategory: e.target.value })}
                          className="block bg-white border border-[#e8d9c8] rounded-lg p-1.5 text-xs mt-0.5">
                          <option value="">無</option>
                          {(subCats[p.category] || []).map((sc: string) => <option key={sc}>{sc}</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-1 text-xs self-end pb-1"><input type="checkbox" checked={editVal.isFeatured} onChange={(e) => setEditVal({ ...editVal, isFeatured: e.target.checked })} />明星</label>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], 'edit')}
                      className="text-xs w-full file:py-1 file:px-2 file:rounded file:bg-amber-50 file:text-amber-700 file:font-bold file:border-0" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(p.id)} className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"><Check className="w-3.5 h-3.5" />儲存</button>
                      <button type="button" onClick={() => setEditing(null)} className="flex items-center gap-1 bg-[#efe4d6] text-[#5c4a3d] text-xs font-bold px-3 py-1.5 rounded-lg"><X className="w-3.5 h-3.5" />取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-[var(--color-ink)] truncate">{p.name}</p>
                        {p.isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-[#7a6555]">${p.price} · {p.category}{p.subCategory ? ` / ${p.subCategory}` : ''}</p>

                      {/* 快速改庫存 */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#9a8674]">庫存</span>
                        {quickStockId === p.id ? (
                          <>
                            <input type="number" min={0} autoFocus value={quickStock}
                              onChange={(e) => setQuickStock(Number(e.target.value))}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveQuickStock(p.id); if (e.key === 'Escape') setQuickStockId(null); }}
                              className="w-20 bg-white border border-[var(--color-copper)] rounded-lg px-2 py-1 text-xs font-bold" />
                            <button type="button" onClick={() => saveQuickStock(p.id)} className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-1 rounded-lg">存</button>
                            <button type="button" onClick={() => setQuickStockId(null)} className="text-[10px] text-[#7a6555] font-bold px-1">取消</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setQuickStockId(p.id); setQuickStock(p.stock); }}
                              className={`text-xs font-black px-2.5 py-1 rounded-lg border ${p.stock <= 5 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[#faf6f1] text-[var(--color-ink)] border-[#eadfce]'}`}>
                              {p.stock}
                            </button>
                            <button type="button" onClick={() => adjustStock(p.id, p.stock, -1)} className="w-7 h-7 rounded-lg bg-[#f3ebe1] text-[#5c4a3d] text-sm font-bold">−</button>
                            <button type="button" onClick={() => adjustStock(p.id, p.stock, 1)} className="w-7 h-7 rounded-lg bg-[#f3ebe1] text-[#5c4a3d] text-sm font-bold">+</button>
                            <button type="button" onClick={() => adjustStock(p.id, p.stock, 10)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800">+10</button>
                          </>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => moveProduct(p.id, -1)} disabled={idx === 0} className="p-1.5 text-[#9a8674] hover:text-[var(--color-copper)] disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => moveProduct(p.id, 1)} disabled={idx === visible.length - 1} className="p-1.5 text-[#9a8674] hover:text-[var(--color-copper)] disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => {
                      setEditing(p.id);
                      setEditVal({ name: p.name || '', description: p.description || '', price: p.price, stock: p.stock, subCategory: p.subCategory || '', isFeatured: !!p.isFeatured, imageBase64: p.imageBase64 || '' });
                    }} className="p-2 text-[#9a8674] hover:text-[var(--color-copper)]" title="完整編輯"><Edit2 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => window.confirm('確定刪除？') && deleteDoc(doc(db, 'products', p.id))}
                      className="p-2 text-[#9a8674] hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}

          {visible.length === 0 && (
            <div className="surface-warm rounded-2xl border-dashed p-12 text-center text-[#9a8674]">
              <p className="font-bold mb-1">尚無商品</p>
              <p className="text-sm">點擊「一鍵匯入範例商品」快速開始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
