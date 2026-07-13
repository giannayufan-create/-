import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getSettingsSnapshot } from '../../lib/settingsCache';
import { DEFAULT_SETTINGS, SAMPLE_PRODUCTS } from '../../lib/seed';
import { Plus, Trash2, Edit2, Check, X, RefreshCw, GripVertical, Star, ChevronUp, ChevronDown, ImagePlus } from 'lucide-react';
import { MAIN_CATEGORIES } from '../../types';
import { fileToBase64 } from '../../lib/imageUpload';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...getSettingsSnapshot() }));
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState({ price: 0, stock: 0, subCategory: '', isFeatured: false, imageBase64: '' });
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 0, category: '火鍋料', subCategory: '', isFeatured: false, imageBase64: '' });
  const [imgError, setImgError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('全部');

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900">商品管理</h1>
          <p className="text-sm text-stone-500">支援大類/小類、拖拉排序、直接上傳商品照片</p>
        </div>
        <button onClick={seedProducts} disabled={seeding}
          className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
          {seeding ? '匯入中...' : '一鍵匯入範例商品'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={addProduct} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit sticky top-4">
          <h3 className="font-bold text-stone-800 flex items-center gap-2"><Plus className="w-4 h-4 text-amber-600" />新增商品</h3>
          <input required placeholder="商品名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea placeholder="商品描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold">
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm">
            <option value="">選擇小類（選填）</option>
            {(subCats[form.category] || []).map((sc) => <option key={sc}>{sc}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" min="1" placeholder="價格" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm" />
            <input required type="number" min="0" placeholder="庫存" value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
            <Star className="w-4 h-4 text-yellow-500" />設為明星商品
          </label>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1 flex items-center gap-1"><ImagePlus className="w-4 h-4" />商品照片</label>
            {form.imageBase64 && <img src={form.imageBase64} alt="" className="w-full h-28 object-cover rounded-xl mb-2 border border-stone-200" />}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], 'form')}
              className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-bold" />
            {imgError && <p className="text-xs text-red-600 mt-1">{imgError}</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
            {loading ? '新增中...' : '確認新增'}
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            {['全部', ...cats].map((c) => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-4 py-2 rounded-full text-xs font-bold ${catFilter === c ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
                {c}{c !== '全部' && ` (${products.filter((p) => p.category === c).length})`}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400">💡 拖曳商品 ≡ 可調整前台顯示順序</p>
          {visible.map((p, idx) => (
            <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(p.id)}
              className={`flex items-center gap-2 p-3 bg-white rounded-xl border border-stone-200 hover:shadow-md transition-shadow ${dragId === p.id ? 'opacity-50' : ''}`}>
              <GripVertical className="w-4 h-4 text-stone-300 cursor-grab shrink-0" />
              {p.imageBase64 ? <img src={p.imageBase64} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <span className="text-lg shrink-0">🍽️</span>}
              <span className="text-xs text-stone-400 w-6 shrink-0">{idx + 1}</span>
              {editing === p.id ? (
                <div className="flex-1 flex flex-wrap gap-2">
                  <input type="number" value={editVal.price} onChange={(e) => setEditVal({ ...editVal, price: Number(e.target.value) })}
                    className="w-20 bg-stone-50 border rounded-lg p-1.5 text-xs" placeholder="價格" />
                  <input type="number" value={editVal.stock} onChange={(e) => setEditVal({ ...editVal, stock: Number(e.target.value) })}
                    className="w-20 bg-stone-50 border rounded-lg p-1.5 text-xs" placeholder="庫存" />
                  <select value={editVal.subCategory} onChange={(e) => setEditVal({ ...editVal, subCategory: e.target.value })}
                    className="bg-stone-50 border rounded-lg p-1.5 text-xs">
                    <option value="">小類</option>
                    {(subCats[p.category] || []).map((sc: string) => <option key={sc}>{sc}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editVal.isFeatured} onChange={(e) => setEditVal({ ...editVal, isFeatured: e.target.checked })} />明星</label>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], 'edit')}
                    className="text-xs w-full file:py-1 file:px-2 file:rounded file:bg-amber-50 file:text-amber-700 file:font-bold file:border-0" />
                  <button onClick={async () => { await updateDoc(doc(db, 'products', p.id), { ...editVal, updatedAt: new Date().toISOString() }); setEditing(null); }}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditing(null)} className="p-1.5 bg-stone-200 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-stone-800">{p.name}</p>
                      {p.isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <p className="text-xs text-stone-500">${p.price} · 庫存 {p.stock} · {p.category}{p.subCategory ? ` / ${p.subCategory}` : ''}</p>
                  </div>
                  <button onClick={() => moveProduct(p.id, -1)} disabled={idx === 0} className="p-1.5 text-stone-400 hover:text-amber-600 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveProduct(p.id, 1)} disabled={idx === products.length - 1} className="p-1.5 text-stone-400 hover:text-amber-600 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => { setEditing(p.id); setEditVal({ price: p.price, stock: p.stock, subCategory: p.subCategory || '', isFeatured: !!p.isFeatured, imageBase64: p.imageBase64 || '' }); }}
                    className="p-2 text-stone-400 hover:text-amber-600"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => window.confirm('確定刪除？') && deleteDoc(doc(db, 'products', p.id))}
                    className="p-2 text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-12 text-center text-stone-400">
              <p className="font-bold mb-1">尚無商品</p>
              <p className="text-sm">點擊「一鍵匯入範例商品」快速開始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
