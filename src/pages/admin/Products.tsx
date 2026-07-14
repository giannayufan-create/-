import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getSettingsSnapshot, setSettingsCache, loadSettings } from '../../lib/settingsCache';
import { DEFAULT_SETTINGS, SAMPLE_PRODUCTS } from '../../lib/seed';
import { AppSettings } from '../../lib/settingsData';
import {
  Download, Plus, Trash2, Edit2, Check, X, RefreshCw, GripVertical, Star,
  ChevronUp, ChevronDown, ImagePlus, Package, Tags, Search, Save,
} from 'lucide-react';
import { MAIN_CATEGORIES } from '../../types';
import { fileToBase64 } from '../../lib/imageUpload';

type EditForm = {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  subCategory: string;
  isFeatured: boolean;
  imageBase64: string;
};

const emptyForm = (category = '火鍋料'): EditForm => ({
  name: '', description: '', price: 0, stock: 0, category, subCategory: '', isFeatured: false, imageBase64: '',
});

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS, ...getSettingsSnapshot() }));
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm());
  const [createForm, setCreateForm] = useState<EditForm>(emptyForm());
  const [showCreate, setShowCreate] = useState(false);
  const [imgError, setImgError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [savingCats, setSavingCats] = useState(false);
  const [catFilter, setCatFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [renameCat, setRenameCat] = useState<{ from: string; to: string } | null>(null);

  // 拖拉：只從把手開始，樂觀更新，避免反白卡住
  const dragIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const sortingRef = useRef(false);

  useEffect(() => {
    void loadSettings().then((s) => setSettings(s));
    return onSnapshot(collection(db, 'products'), (s) => {
      if (sortingRef.current) return; // 拖拉寫入中先不覆蓋樂觀順序
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setProducts(docs);
    });
  }, []);

  const cats = settings.categoryOrder?.length ? settings.categoryOrder : [...MAIN_CATEGORIES];
  const subCats = settings.subCategories || {};

  const visible = products.filter((p) => {
    if (catFilter !== '全部' && p.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const persistSettings = async (next: AppSettings) => {
    setSavingCats(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { ...next, updatedAt: new Date().toISOString() }, { merge: true });
      setSettingsCache(next);
      setSettings(next);
      flash('分類已儲存');
    } finally {
      setSavingCats(false);
    }
  };

  const handleImage = async (file: File, target: 'create' | 'edit') => {
    setImgError('');
    try {
      const base64 = await fileToBase64(file);
      if (target === 'create') setCreateForm((f) => ({ ...f, imageBase64: base64 }));
      else setEditForm((f) => ({ ...f, imageBase64: base64 }));
    } catch (e: any) {
      setImgError(e.message || '圖片上傳失敗');
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || createForm.price <= 0) {
      flash('請填寫名稱與價格');
      return;
    }
    setLoading(true);
    const now = new Date().toISOString();
    const maxOrder = products.reduce((m, p) => Math.max(m, p.sortOrder || 0), 0);
    await addDoc(collection(db, 'products'), {
      ...createForm,
      name: createForm.name.trim(),
      stock: Math.max(0, Number(createForm.stock) || 0),
      price: Number(createForm.price) || 0,
      sortOrder: maxOrder + 1,
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    setCreateForm(emptyForm(cats[0] || '火鍋料'));
    setShowCreate(false);
    setLoading(false);
    flash('商品已新增');
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price || 0,
      stock: p.stock ?? 0,
      category: p.category || cats[0],
      subCategory: p.subCategory || '',
      isFeatured: !!p.isFeatured,
      imageBase64: p.imageBase64 || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) {
      flash('商品名稱不可空白');
      return;
    }
    setLoading(true);
    await updateDoc(doc(db, 'products', editingId), {
      name: editForm.name.trim(),
      description: editForm.description,
      price: Number(editForm.price) || 0,
      stock: Math.max(0, Number(editForm.stock) || 0),
      category: editForm.category,
      subCategory: editForm.subCategory,
      isFeatured: editForm.isFeatured,
      imageBase64: editForm.imageBase64,
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
    setLoading(false);
    flash('商品已更新');
  };

  const saveStockPrice = async (id: string, stock: number, price: number) => {
    await updateDoc(doc(db, 'products', id), {
      stock: Math.max(0, Math.floor(stock) || 0),
      price: Math.max(0, Number(price) || 0),
      updatedAt: new Date().toISOString(),
    });
    flash('價格／庫存已更新');
  };

  const moveProduct = async (id: string, dir: -1 | 1) => {
    const list = [...products];
    const idx = list.findIndex((p) => p.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    await commitOrder(list);
  };

  const commitOrder = async (ordered: any[]) => {
    sortingRef.current = true;
    const withOrder = ordered.map((p, i) => ({ ...p, sortOrder: i + 1 }));
    setProducts(withOrder);
    setDraggingId(null);
    setDragOverId(null);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      withOrder.forEach((p) => {
        batch.update(doc(db, 'products', p.id), { sortOrder: p.sortOrder, updatedAt: now });
      });
      await batch.commit();
    } finally {
      setTimeout(() => { sortingRef.current = false; }, 400);
    }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    dragIdRef.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // 避免文字反白卡住
    document.body.classList.add('select-none');
  };

  const onDragEnd = () => {
    dragIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    document.body.classList.remove('select-none');
  };

  const onDropRow = async (targetId: string) => {
    const fromId = dragIdRef.current;
    document.body.classList.remove('select-none');
    if (!fromId || fromId === targetId) {
      onDragEnd();
      return;
    }
    const list = [...products];
    const from = list.findIndex((p) => p.id === fromId);
    const to = list.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) {
      onDragEnd();
      return;
    }
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    await commitOrder(list);
  };

  // —— 分類管理 ——
  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    if (cats.includes(name)) {
      flash('此大類已存在');
      return;
    }
    const next = {
      ...settings,
      categoryOrder: [...cats, name],
      subCategories: { ...subCats, [name]: [] },
    };
    setNewCat('');
    await persistSettings(next);
  };

  const deleteCategory = async (cat: string) => {
    const used = products.filter((p) => p.category === cat).length;
    if (!window.confirm(used > 0
      ? `「${cat}」尚有 ${used} 個商品，刪除後商品會改為「其他」。確定刪除？`
      : `確定刪除大類「${cat}」？`)) return;

    const nextOrder = cats.filter((c) => c !== cat);
    const nextSubs = { ...subCats };
    delete nextSubs[cat];
    if (!nextOrder.includes('其他')) nextOrder.push('其他');
    if (!nextSubs['其他']) nextSubs['其他'] = [];

    const next = { ...settings, categoryOrder: nextOrder, subCategories: nextSubs };
    await persistSettings(next);

    const batch = writeBatch(db);
    products.filter((p) => p.category === cat).forEach((p) => {
      batch.update(doc(db, 'products', p.id), { category: '其他', subCategory: '', updatedAt: new Date().toISOString() });
    });
    if (products.some((p) => p.category === cat)) await batch.commit();
  };

  const applyRenameCategory = async () => {
    if (!renameCat) return;
    const from = renameCat.from;
    const to = renameCat.to.trim();
    if (!to || to === from) {
      setRenameCat(null);
      return;
    }
    if (cats.includes(to)) {
      flash('新名稱與現有大類重複');
      return;
    }
    const nextOrder = cats.map((c) => (c === from ? to : c));
    const nextSubs = { ...subCats };
    nextSubs[to] = nextSubs[from] || [];
    delete nextSubs[from];
    await persistSettings({ ...settings, categoryOrder: nextOrder, subCategories: nextSubs });

    const batch = writeBatch(db);
    products.filter((p) => p.category === from).forEach((p) => {
      batch.update(doc(db, 'products', p.id), { category: to, updatedAt: new Date().toISOString() });
    });
    if (products.some((p) => p.category === from)) await batch.commit();
    setRenameCat(null);
  };

  const addSubCategory = async (cat: string) => {
    const name = (newSub[cat] || '').trim();
    if (!name) return;
    const list = subCats[cat] || [];
    if (list.includes(name)) {
      flash('此小類已存在');
      return;
    }
    await persistSettings({
      ...settings,
      subCategories: { ...subCats, [cat]: [...list, name] },
    });
    setNewSub({ ...newSub, [cat]: '' });
  };

  const removeSubCategory = async (cat: string, sub: string) => {
    if (!window.confirm(`刪除小類「${sub}」？`)) return;
    await persistSettings({
      ...settings,
      subCategories: {
        ...subCats,
        [cat]: (subCats[cat] || []).filter((s) => s !== sub),
      },
    });
    const batch = writeBatch(db);
    products.filter((p) => p.category === cat && p.subCategory === sub).forEach((p) => {
      batch.update(doc(db, 'products', p.id), { subCategory: '', updatedAt: new Date().toISOString() });
    });
    if (products.some((p) => p.category === cat && p.subCategory === sub)) await batch.commit();
  };

  const moveCategory = async (idx: number, dir: -1 | 1) => {
    const arr = [...cats];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    await persistSettings({ ...settings, categoryOrder: arr });
  };

  const seedProducts = async () => {
    setSeeding(true);
    const now = new Date().toISOString();
    for (const p of SAMPLE_PRODUCTS) await addDoc(collection(db, 'products'), { ...p, salesCount: 0, createdAt: now, updatedAt: now });
    setSeeding(false);
    flash('範例商品已匯入');
  };

  const Field = useCallback(({ label, children }: { label: string; children: ReactNode }) => (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold text-[#7a6555] tracking-wide">{label}</span>
      {children}
    </label>
  ), []);

  const inputCls = 'w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30';

  return (
    <div className="select-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">商品管理</h1>
          <p className="text-sm text-[#7a6555]">名稱／價格／庫存清楚標示 · 大類小類可新增刪除 · 拖拉只從把手操作</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            if (!products.length) return;
            const headers = ['名稱', '大類', '小類', '價格', '庫存', '精選', '銷量', '說明'];
            const rows = products.map((p) => [
              p.name, p.category, p.subCategory, p.price, p.stock,
              p.isFeatured ? '是' : '否', p.salesCount ?? 0, p.description || '',
            ]);
            const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '商品清單.csv'; a.click();
          }}
            className="flex items-center gap-2 bg-white border border-[#e8d9c8] px-3 py-2 rounded-xl text-xs font-bold">
            <Download className="w-3.5 h-3.5" />匯出 CSV
          </button>
          <button type="button" onClick={seedProducts} disabled={seeding}
            className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />匯入範例
          </button>
          <button type="button" onClick={() => { setShowCreate(true); setCreateForm(emptyForm(cats[0])); }}
            className="btn-copper flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold">
            <Plus className="w-4 h-4" />新增商品
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold">
          {toast}
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <button type="button" onClick={() => setTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${tab === 'products' ? 'bg-[var(--color-ink)] text-white border-transparent' : 'bg-white text-[#6b5648] border-[#e8d9c8]'}`}>
          <Package className="w-4 h-4" />商品列表
        </button>
        <button type="button" onClick={() => setTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${tab === 'categories' ? 'bg-[var(--color-ink)] text-white border-transparent' : 'bg-white text-[#6b5648] border-[#e8d9c8]'}`}>
          <Tags className="w-4 h-4" />分類管理（大類／小類）
        </button>
      </div>

      {tab === 'categories' && (
        <div className="space-y-4 max-w-3xl">
          <div className="surface-warm rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-[var(--color-ink)]">新增大類</h3>
            <p className="text-xs text-[#9a8674]">例如：早餐、湯品、飲料… 新增後前台菜單會出現此分類</p>
            <div className="flex gap-2">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="輸入大類名稱，例如：早餐"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                className={inputCls} />
              <button type="button" onClick={addCategory} disabled={savingCats}
                className="shrink-0 btn-copper px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">新增</button>
            </div>
          </div>

          {cats.map((cat, idx) => (
            <div key={cat} className="surface-warm rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {renameCat?.from === cat ? (
                  <>
                    <input autoFocus value={renameCat.to} onChange={(e) => setRenameCat({ from: cat, to: e.target.value })}
                      className="flex-1 min-w-[140px] bg-white border border-[var(--color-copper)] rounded-xl p-2 text-sm font-bold" />
                    <button type="button" onClick={applyRenameCategory} className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Check className="w-3.5 h-3.5" />儲存名稱</button>
                    <button type="button" onClick={() => setRenameCat(null)} className="text-xs font-bold text-[#7a6555] px-2">取消</button>
                  </>
                ) : (
                  <>
                    <h3 className="font-display font-bold text-lg text-[var(--color-ink)] flex-1">{cat}</h3>
                    <button type="button" onClick={() => moveCategory(idx, -1)} disabled={idx === 0} className="p-1.5 text-[#9a8674] disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => moveCategory(idx, 1)} disabled={idx === cats.length - 1} className="p-1.5 text-[#9a8674] disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setRenameCat({ from: cat, to: cat })} className="text-xs font-bold text-[var(--color-copper)] px-2 py-1 rounded-lg hover:bg-[#f6efe6]">重新命名</button>
                    <button type="button" onClick={() => deleteCategory(cat)} className="text-xs font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />刪除大類</button>
                  </>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-[#7a6555] mb-2">小類</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(subCats[cat] || []).length === 0 && <span className="text-xs text-[#9a8674]">尚無小類</span>}
                  {(subCats[cat] || []).map((sub) => (
                    <span key={sub} className="inline-flex items-center gap-1.5 bg-white border border-[#eadfce] px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--color-ink)]">
                      {sub}
                      <button type="button" onClick={() => removeSubCategory(cat, sub)} className="text-[#9a8674] hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newSub[cat] || ''} onChange={(e) => setNewSub({ ...newSub, [cat]: e.target.value })}
                    placeholder={`新增「${cat}」的小類`}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubCategory(cat))}
                    className={inputCls} />
                  <button type="button" onClick={() => addSubCategory(cat)} className="shrink-0 bg-[var(--color-ink)] text-white px-3 py-2 rounded-xl text-xs font-bold">新增小類</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'products' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9a8674] absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋商品名稱…"
                className={`pl-9 ${inputCls}`} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {['全部', ...cats].map((c) => (
              <button key={c} type="button" onClick={() => setCatFilter(c)}
                className={`chip whitespace-nowrap px-4 py-2 text-xs font-bold border ${catFilter === c ? 'chip-active' : 'bg-white border-[#e8d9c8] text-[#6b5648]'}`}>
                {c}{c !== '全部' ? ` (${products.filter((p) => p.category === c).length})` : ` (${products.length})`}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9a8674] mb-3">請抓住左側 ≡ 把手拖拉排序（不要拖整列，避免反白卡住）</p>

          <div className="space-y-3">
            {visible.map((p, idx) => (
              <div
                key={p.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(p.id); }}
                onDrop={(e) => { e.preventDefault(); void onDropRow(p.id); }}
                className={`surface-warm rounded-2xl p-4 transition-opacity ${draggingId === p.id ? 'opacity-40' : ''} ${dragOverId === p.id && draggingId !== p.id ? 'ring-2 ring-[var(--color-copper)]/40' : ''}`}
              >
                <div className="flex gap-3 items-start">
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => onDragStart(e, p.id)}
                    onDragEnd={onDragEnd}
                    className="mt-1 p-1.5 rounded-lg text-[#c4b0a0] hover:bg-[#f3ebe1] cursor-grab active:cursor-grabbing touch-none"
                    title="拖曳排序"
                    aria-label="拖曳排序"
                  >
                    <GripVertical className="w-5 h-5 pointer-events-none" />
                  </button>

                  {p.imageBase64
                    ? <img src={p.imageBase64} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-[#f3ebe1] flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-[var(--color-copper)]" /></div>}

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-[#9a8674] font-bold">#{idx + 1}</span>
                      <h3 className="font-bold text-[var(--color-ink)] text-base">{p.name}</h3>
                      {p.isFeatured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                      <span className="text-[10px] font-bold bg-[#f3ebe1] text-[#6b5648] px-2 py-0.5 rounded-lg">{p.category}{p.subCategory ? ` / ${p.subCategory}` : ''}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Field label="價格（元）">
                        <input
                          type="number"
                          min={0}
                          defaultValue={p.price}
                          key={`price-${p.id}-${p.price}`}
                          onBlur={(e) => {
                            const price = Number(e.target.value);
                            if (price !== p.price) void saveStockPrice(p.id, p.stock, price);
                          }}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="庫存（份）">
                        <input
                          type="number"
                          min={0}
                          defaultValue={p.stock}
                          key={`stock-${p.id}-${p.stock}`}
                          onBlur={(e) => {
                            const stock = Number(e.target.value);
                            if (stock !== p.stock) void saveStockPrice(p.id, stock, p.price);
                          }}
                          className={`${inputCls} ${p.stock <= 5 ? 'border-red-300 bg-red-50/40' : ''}`}
                        />
                      </Field>
                      <div className="col-span-2 flex items-end gap-1.5">
                        <button type="button" onClick={() => moveProduct(p.id, -1)} className="p-2 rounded-xl bg-[#f3ebe1] text-[#5c4a3d]" title="上移"><ChevronUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => moveProduct(p.id, 1)} className="p-2 rounded-xl bg-[#f3ebe1] text-[#5c4a3d]" title="下移"><ChevronDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--color-ink)] text-white text-xs font-bold py-2.5 rounded-xl">
                          <Edit2 className="w-3.5 h-3.5" />編輯名稱／詳情
                        </button>
                        <button type="button" onClick={() => window.confirm(`確定刪除「${p.name}」？`) && deleteDoc(doc(db, 'products', p.id))}
                          className="p-2.5 rounded-xl bg-red-50 text-red-600" title="刪除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {visible.length === 0 && (
              <div className="surface-warm rounded-2xl p-12 text-center text-[#9a8674]">
                <p className="font-bold">沒有符合的商品</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* 編輯商品 Modal */}
      {editingId && (
        <div className="fixed inset-0 z-[400] bg-[var(--color-ink)]/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div className="bg-[#fffcf8] rounded-3xl border border-[#eadfce] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-[var(--color-ink)]">編輯商品</h3>
              <button type="button" onClick={() => setEditingId(null)} className="p-2 text-[#9a8674] hover:text-[var(--color-ink)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="商品名稱 *">
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} placeholder="輸入商品名稱" />
              </Field>
              <Field label="商品描述">
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className={`${inputCls} h-20 resize-none`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="價格（元）*">
                  <input type="number" min={0} value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="庫存（份）*">
                  <input type="number" min={0} value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="大類">
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value, subCategory: '' })} className={inputCls}>
                    {cats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="小類">
                  <select value={editForm.subCategory} onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })} className={inputCls}>
                    <option value="">無</option>
                    {(subCats[editForm.category] || []).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-[#5c4a3d]">
                <input type="checkbox" checked={editForm.isFeatured} onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })} />
                <Star className="w-4 h-4 text-yellow-500" />設為明星商品
              </label>
              <Field label="商品照片">
                {editForm.imageBase64 && <img src={editForm.imageBase64} alt="" className="w-full h-32 object-cover rounded-xl mb-2 border border-[#eadfce]" />}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], 'edit')}
                  className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-800 file:font-bold" />
              </Field>
              {imgError && <p className="text-xs text-red-600">{imgError}</p>}
              <button type="button" disabled={loading} onClick={saveEdit}
                className="w-full btn-copper font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />{loading ? '儲存中…' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增商品 Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[400] bg-[var(--color-ink)]/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#fffcf8] rounded-3xl border border-[#eadfce] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-[var(--color-ink)]">新增商品</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2 text-[#9a8674]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addProduct} className="space-y-3">
              <Field label="商品名稱 *">
                <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className={inputCls} placeholder="輸入商品名稱" />
              </Field>
              <Field label="商品描述">
                <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className={`${inputCls} h-20 resize-none`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="價格（元）*">
                  <input required type="number" min={1} value={createForm.price || ''} onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="庫存（份）*">
                  <input required type="number" min={0} value={createForm.stock || ''} onChange={(e) => setCreateForm({ ...createForm, stock: Number(e.target.value) })} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="大類">
                  <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value, subCategory: '' })} className={inputCls}>
                    {cats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="小類">
                  <select value={createForm.subCategory} onChange={(e) => setCreateForm({ ...createForm, subCategory: e.target.value })} className={inputCls}>
                    <option value="">無</option>
                    {(subCats[createForm.category] || []).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-[#5c4a3d]">
                <input type="checkbox" checked={createForm.isFeatured} onChange={(e) => setCreateForm({ ...createForm, isFeatured: e.target.checked })} />
                <Star className="w-4 h-4 text-yellow-500" />設為明星商品
              </label>
              <Field label="商品照片">
                {createForm.imageBase64 && <img src={createForm.imageBase64} alt="" className="w-full h-32 object-cover rounded-xl mb-2" />}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], 'create')}
                  className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-800 file:font-bold" />
              </Field>
              <button type="submit" disabled={loading} className="w-full btn-copper font-bold py-3 rounded-xl disabled:opacity-50">
                {loading ? '新增中…' : '確認新增'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
