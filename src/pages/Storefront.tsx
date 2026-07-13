import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../lib/store';
import AdminPreviewBar from '../components/AdminPreviewBar';
import { Plus, Minus, Search, Star, TrendingUp } from 'lucide-react';
import Carousel from '../components/Carousel';
import { MAIN_CATEGORIES } from '../types';
import { useSiteSettings } from '../lib/useSettings';

const EMOJI: Record<string, string> = { '火鍋料': '🍲', '水餃': '🥟', '滷味': '🍗' };

export default function Storefront() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('全部');
  const [subCategory, setSubCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [pickQtys, setPickQtys] = useState<Record<string, number>>({});
  const { addToCart, cart, userRole } = useStore();
  const { settings, texts } = useSiteSettings();

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'products')), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setProducts(docs);
      setLoading(false);
    });
    getDocs(collection(db, 'orders')).then((s) => setOrders(s.docs.map((d) => d.data()))).catch(() => {});
    return () => { u1(); };
  }, []);

  const salesMap = useMemo(() => {
    const m: Record<string, number> = {};
    orders.filter((o) => o.status !== 'cancelled').forEach((o) => {
      o.items?.forEach((i: any) => { m[i.productId] = (m[i.productId] || 0) + i.quantity; });
    });
    return m;
  }, [orders]);

  const cats = settings.categoryOrder?.length ? settings.categoryOrder : MAIN_CATEGORIES;
  const subCats = category !== '全部' ? (settings.subCategories?.[category] || []) : [];

  const filtered = useMemo(() => {
    let list = products;
    if (category !== '全部') list = list.filter((p) => p.category === category);
    if (subCategory !== '全部') list = list.filter((p) => p.subCategory === subCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    return list;
  }, [products, category, subCategory, search]);

  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const bestsellers = [...products].sort((a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0)).filter((p) => salesMap[p.id] > 0).slice(0, 4);

  const getPickQty = useCallback((id: string) => pickQtys[id] || 1, [pickQtys]);
  const setPickQty = (id: string, qty: number) => setPickQtys((prev) => ({ ...prev, [id]: qty }));

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const confirmAdd = (p: any) => {
    if (p.stock <= 0) {
      showToast('目前缺貨中');
      return;
    }
    const pickQty = getPickQty(p.id);
    const inCart = cart.find((i) => i.productId === p.id)?.quantity || 0;
    if (inCart + pickQty > p.stock) {
      showToast(`⚠️ ${p.name} 庫存不足，僅剩 ${p.stock} 份`);
      return;
    }
    addToCart({ productId: p.id, name: p.name, price: p.price, quantity: pickQty });
    showToast(`✅ ${texts.addSuccess}`);
  };

  const ProductCard = ({ p }: { p: any }) => {
    const pickQty = getPickQty(p.id);
    const inCart = cart.find((i) => i.productId === p.id)?.quantity || 0;
    const soldOut = p.stock <= 0;
    const maxPick = Math.max(0, p.stock - inCart);

    return (
      <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col ${soldOut ? 'border-red-100 opacity-90' : 'border-stone-100'}`}>
        <div className="h-44 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative overflow-hidden shrink-0">
          {p.imageBase64 ? <img src={p.imageBase64} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-6xl">{EMOJI[p.category] || '🍽️'}</span>}
          <span className="absolute top-2 left-2 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{p.category}{p.subCategory ? ` · ${p.subCategory}` : ''}</span>
          {p.isFeatured && <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" />明星</span>}
          {soldOut && <div className="absolute inset-0 bg-stone-900/55 flex items-center justify-center"><span className="bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-full">目前缺貨中</span></div>}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-stone-900">{p.name}</h3>
            <span className="font-black text-amber-600 text-xl">${p.price}</span>
          </div>
          <p className="text-xs text-stone-500 mb-2 line-clamp-2 flex-1">{p.description}</p>
          <p className="text-[10px] mb-3">
            {soldOut ? (
              <span className="text-red-600 font-bold">目前缺貨中</span>
            ) : (
              <span className="text-stone-400">{texts.stockLabel} {p.stock} · {texts.soldLabel} {salesMap[p.id] || 0}{inCart > 0 ? ` · 購物車 ${inCart}` : ''}</span>
            )}
          </p>

          <div className="space-y-2 mt-auto">
            {!soldOut && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600">{texts.quantityLabel}</span>
              <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
                <button type="button" onClick={() => setPickQty(p.id, Math.max(1, pickQty - 1))} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg"><Minus className="w-4 h-4" /></button>
                <span className="w-8 text-center font-black text-sm">{pickQty}</span>
                <button type="button" disabled={pickQty >= maxPick} onClick={() => setPickQty(p.id, pickQty + 1)} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg disabled:opacity-30"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            )}
            <button type="button" onClick={() => confirmAdd(p)} disabled={soldOut || maxPick <= 0}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-colors ${
                soldOut || maxPick <= 0
                  ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed'
                  : 'bg-stone-900 hover:bg-amber-600 text-white'
              }`}>
              {soldOut || maxPick <= 0 ? '目前缺貨中' : <><Plus className="w-4 h-4" />{texts.addToCartBtn}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {userRole === 'admin' && <AdminPreviewBar />}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <Carousel slides={settings.carousel} storeName={settings.storeName} />

      {featured.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-black text-stone-900 mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />{texts.featuredTitle}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {bestsellers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-black text-stone-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" />{texts.bestsellerTitle}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{bestsellers.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={texts.searchPlaceholder}
            className="w-full pl-9 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {['全部', ...cats].map((c) => (
          <button key={c} onClick={() => { setCategory(c); setSubCategory('全部'); }}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold ${category === c ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200'}`}>{c}</button>
        ))}
      </div>

      {subCats.length > 0 && category !== '全部' && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {['全部', ...subCats].map((sc) => (
            <button key={sc} onClick={() => setSubCategory(sc)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${subCategory === sc ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>{sc}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map((i) => <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-200"><p className="font-bold text-stone-700">找不到商品</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </div>
  );
}
