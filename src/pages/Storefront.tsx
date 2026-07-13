import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../lib/store';
import AdminPreviewBar from '../components/AdminPreviewBar';
import { Plus, Minus, Search, Star, TrendingUp, ShoppingCart, ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import { MAIN_CATEGORIES } from '../types';
import { useSiteSettings } from '../lib/useSettings';

const PLACEHOLDER: Record<string, string> = {
  '火鍋料': '火',
  '水餃': '餃',
  '滷味': '滷',
};

export default function Storefront() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('全部');
  const [subCategory, setSubCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [pickQtys, setPickQtys] = useState<Record<string, number>>({});
  const { addToCart, cart, cartTotal, userRole } = useStore();
  const { settings, texts } = useSiteSettings();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      showToast(`${p.name} 庫存不足，僅剩 ${p.stock} 份`);
      return;
    }
    addToCart({ productId: p.id, name: p.name, price: p.price, quantity: pickQty });
    setPickQtys((prev) => ({ ...prev, [p.id]: 1 }));
    showToast(texts.addSuccess);
  };

  const clampQty = (p: any, raw: number) => {
    const inCart = cart.find((i) => i.productId === p.id)?.quantity || 0;
    const max = Math.max(0, p.stock - inCart);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.min(raw, Math.max(1, max));
  };

  const ProductCard = ({ p }: { p: any }) => {
    const pickQty = getPickQty(p.id);
    const inCart = cart.find((i) => i.productId === p.id)?.quantity || 0;
    const soldOut = p.stock <= 0;
    const maxPick = Math.max(0, p.stock - inCart);

    return (
      <div className={`product-card rounded-2xl overflow-hidden flex flex-col ${soldOut ? 'opacity-85' : ''}`}>
        <div className="h-44 bg-[linear-gradient(145deg,#f6efe6,#e8d4c0)] flex items-center justify-center relative overflow-hidden shrink-0">
          {p.imageBase64 ? (
            <img src={p.imageBase64} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-5xl text-[var(--color-copper)]/40 font-bold">{PLACEHOLDER[p.category] || '味'}</span>
          )}
          <span className="absolute top-2.5 left-2.5 bg-[var(--color-ink)]/80 text-[#f0d2b0] text-[10px] font-bold px-2.5 py-1 rounded-lg tracking-wide">
            {p.category}{p.subCategory ? ` · ${p.subCategory}` : ''}
          </span>
          {p.isFeatured && (
            <span className="absolute top-2.5 right-2.5 bg-[#f0d2b0] text-[var(--color-ink)] text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-current" />精選
            </span>
          )}
          {soldOut && (
            <div className="absolute inset-0 bg-[var(--color-ink)]/55 flex items-center justify-center">
              <span className="bg-[#8b3a2a] text-white font-bold text-sm px-4 py-2 rounded-xl">目前缺貨中</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start gap-2 mb-1.5">
            <h3 className="font-display font-bold text-[var(--color-ink)] text-[15px] leading-snug">{p.name}</h3>
            <span className="font-black text-[var(--color-copper)] text-lg shrink-0">${p.price}</span>
          </div>
          <p className="text-xs text-[#7a6555] mb-2 line-clamp-2 flex-1 leading-relaxed">{p.description}</p>
          <p className="text-[10px] mb-3">
            {soldOut ? (
              <span className="text-[#b5452c] font-bold">目前缺貨中</span>
            ) : (
              <span className="text-[#9a8674]">{texts.stockLabel} {p.stock}{inCart > 0 ? ` · 購物車 ${inCart}` : ''}</span>
            )}
          </p>

          <div className="space-y-2 mt-auto">
            {!soldOut && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6b5648]">{texts.quantityLabel}</span>
                <div className="flex items-center gap-1 bg-[#f3ebe1] rounded-xl p-1">
                  <button type="button" onClick={() => setPickQty(p.id, Math.max(1, pickQty - 1))} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-[#5c4a3d]"><Minus className="w-4 h-4" /></button>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, maxPick)}
                    value={pickQty}
                    onChange={(e) => setPickQty(p.id, clampQty(p, Number(e.target.value)))}
                    onBlur={() => setPickQty(p.id, clampQty(p, pickQty))}
                    className="w-12 text-center font-black text-sm text-[var(--color-ink)] bg-white rounded-lg border border-[#eadfce] py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30"
                  />
                  <button type="button" disabled={pickQty >= maxPick} onClick={() => setPickQty(p.id, Math.min(maxPick, pickQty + 1))} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-[#5c4a3d] disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            <button type="button" onClick={() => confirmAdd(p)} disabled={soldOut || maxPick <= 0}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all ${
                soldOut || maxPick <= 0
                  ? 'bg-[#fdf2ef] text-[#b5452c] border border-[#f0d5ce] cursor-not-allowed'
                  : 'btn-ink'
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-ink)] text-[#f0d2b0] px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_12px_30px_-12px_rgba(28,20,16,0.5)] pointer-events-none fade-up">
          {toast}
        </div>
      )}

      <Carousel slides={settings.carousel} storeName={settings.storeName} />

      {featured.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title text-xl text-[var(--color-ink)] mb-5 flex items-center gap-2">
            <Star className="w-5 h-5 text-[var(--color-ember)] fill-[var(--color-ember)]" />
            {texts.featuredTitle}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {bestsellers.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title text-xl text-[var(--color-ink)] mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-copper)]" />
            {texts.bestsellerTitle}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{bestsellers.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9a8674] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={texts.searchPlaceholder}
            className="w-full pl-10 pr-4 py-3 surface-warm rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {['全部', ...cats].map((c) => (
          <button key={c} onClick={() => { setCategory(c); setSubCategory('全部'); }}
            className={`chip whitespace-nowrap px-4 py-2.5 text-sm font-bold border ${
              category === c ? 'chip-active' : 'bg-white/70 text-[#6b5648] border-[#e8d9c8] hover:border-[var(--color-copper)]/40'
            }`}>{c}</button>
        ))}
      </div>

      {subCats.length > 0 && category !== '全部' && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {['全部', ...subCats].map((sc) => (
            <button key={sc} onClick={() => setSubCategory(sc)}
              className={`chip whitespace-nowrap px-3 py-1.5 text-xs font-bold border ${
                subCategory === sc ? 'chip-active' : 'bg-[#f3ebe1] text-[#6b5648] border-transparent'
              }`}>{sc}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="bg-[#efe4d6]/60 rounded-2xl h-80 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 surface-warm rounded-2xl border-dashed"><p className="font-display font-bold text-[#5c4a3d]">找不到商品</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
          <Link to="/cart" className="flex items-center justify-between gap-3 bg-[var(--color-ink)] text-white rounded-2xl px-5 py-3.5 shadow-[0_16px_40px_-12px_rgba(28,20,16,0.5)]">
            <span className="flex items-center gap-2 font-bold text-sm">
              <ShoppingCart className="w-4 h-4 text-[var(--color-ember)]" />
              購物車 {cart.reduce((s, i) => s + i.quantity, 0)} 件
            </span>
            <span className="font-display font-bold text-[#f0d2b0]">${cartTotal.toFixed(0)} · 去結帳</span>
          </Link>
        </div>
      )}

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-36 md:bottom-24 right-4 z-40 w-11 h-11 rounded-xl bg-white/95 border border-[#eadfce] text-[var(--color-ink)] flex items-center justify-center shadow-md hover:bg-[#f6efe6]"
          aria-label="回到頂部"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
