import { useEffect, useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Truck } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../lib/useSettings';
import FavoriteButton from './FavoriteButton';

type Props = {
  product: any | null;
  onClose: () => void;
};

export default function ProductDetailModal({ product, onClose }: Props) {
  const { addToCart, cart } = useStore();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setQty(1);
    setToast('');
  }, [product?.id]);

  if (!product) return null;

  const soldOut = product.stock <= 0;
  const inCart = cart.find((i) => i.productId === product.id)?.quantity || 0;
  const max = Math.max(0, product.stock - inCart);

  const add = (goCheckout = false) => {
    if (soldOut || max <= 0) return;
    const q = Math.min(Math.max(1, qty), max);
    addToCart({ productId: product.id, name: product.name, price: product.price, quantity: q });
    setToast('已加入購物車');
    if (goCheckout) {
      onClose();
      navigate('/cart');
    } else {
      setTimeout(() => setToast(''), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-[415] bg-[var(--color-ink)]/55 backdrop-blur-sm flex items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-[#fffcf8] rounded-3xl border border-[#eadfce] overflow-hidden max-h-[92vh] overflow-y-auto shadow-[0_30px_80px_-24px_rgba(28,20,16,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#eadfce] bg-[#f6efe6]">
          <p className="text-xs font-bold text-[#9a8674]">商品介紹</p>
          <div className="flex items-center gap-2">
            <FavoriteButton productId={product.id} size="md" className="w-9 h-9" />
            <button type="button" onClick={onClose} className="p-2 text-[#9a8674] hover:text-[var(--color-ink)]"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="bg-[#f3ebe1] min-h-[260px] md:min-h-[380px] flex items-center justify-center relative">
            {product.imageBase64 ? (
              <img src={product.imageBase64} alt={product.name} className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <span className="font-display text-7xl text-[var(--color-copper)]/35 font-bold">{(product.name || '味')[0]}</span>
            )}
          </div>

          <div className="p-6 md:p-8 flex flex-col">
            <p className="text-[11px] font-bold text-[#9a8674] mb-1">
              {product.category}{product.subCategory ? ` · ${product.subCategory}` : ''}
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--color-ink)] tracking-wide mb-3">{product.name}</h2>
            <p className="font-display text-3xl font-bold text-[var(--color-copper)] mb-4">TWD ${product.price}</p>
            <p className="text-sm text-[#7a6555] leading-relaxed mb-5 flex-1">{product.description || '新鮮美味，歡迎訂購。'}</p>

            {!soldOut && (
              <div className="mb-4">
                <p className="text-xs font-bold text-[#7a6555] mb-2">數量</p>
                <div className="inline-flex items-center gap-1 bg-[#f3ebe1] rounded-xl p-1">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                  <input type="number" min={1} max={Math.max(1, max)} value={qty}
                    onChange={(e) => setQty(Math.min(Math.max(1, Number(e.target.value) || 1), Math.max(1, max)))}
                    className="w-14 text-center font-black bg-white rounded-lg border border-[#eadfce] py-1.5 text-sm" />
                  <button type="button" disabled={qty >= max} onClick={() => setQty(Math.min(max, qty + 1))} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                </div>
                <p className="text-[10px] text-[#9a8674] mt-1.5">庫存 {product.stock}{inCart > 0 ? ` · 購物車已有 ${inCart}` : ''}</p>
              </div>
            )}

            {soldOut ? (
              <div className="py-3 text-center rounded-xl bg-red-50 text-red-700 font-bold text-sm border border-red-100">目前缺貨中</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => add(false)} disabled={max <= 0}
                  className="btn-ink py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                  <ShoppingCart className="w-4 h-4" />加入購物車
                </button>
                <button type="button" onClick={() => add(true)} disabled={max <= 0}
                  className="btn-copper py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                  立即結帳
                </button>
              </div>
            )}

            {toast && <p className="mt-3 text-center text-xs font-bold text-emerald-700">{toast}</p>}

            <div className="mt-5 rounded-xl bg-[#f6efe6] border border-[#eadfce] p-3 text-xs text-[#7a6555] space-y-1">
              <p className="flex items-center gap-1.5 font-bold text-[var(--color-ink)]"><Truck className="w-3.5 h-3.5 text-[var(--color-copper)]" />訂購資訊</p>
              <p>送貨：新竹以北 · 不限金額配送</p>
              {settings.storePhone && <p>電話：{settings.storePhone}</p>}
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-5 border-t border-[#eadfce] bg-white">
          <h3 className="font-display font-bold text-[var(--color-ink)] mb-2">商品詳情</h3>
          <p className="text-sm text-[#7a6555] leading-relaxed whitespace-pre-line">
            {product.description || '新鮮食材，用心製作。如需大量訂購歡迎透過聯絡我們或 LINE 詢問。'}
          </p>
        </div>
      </div>
    </div>
  );
}
