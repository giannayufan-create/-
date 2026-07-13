import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../lib/store';
import { notifyOrderPlaced } from '../lib/orderNotify';
import { DELIVERY_TIME_SLOTS, minDeliveryDate, maxDeliveryDate } from '../lib/deliverySlots';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useSiteSettings } from '../lib/useSettings';
import { DELIVERY_METHOD_OPTIONS, PAYMENT_METHOD_OPTIONS, PaymentMethodId, DeliveryMethodId } from '../types';

export default function Cart() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, user, userData, setAuthModalOpen, setProfileModalOpen } = useStore();
  const { settings, texts } = useSiteSettings();
  const [products, setProducts] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | ''>('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodId | ''>('');
  const navigate = useNavigate();

  const paymentOptions = useMemo(() => PAYMENT_METHOD_OPTIONS.map((o) => ({
    ...o,
    enabled:
      o.id === 'cash' ? settings.paymentCashEnabled !== false
      : o.id === 'transfer' ? !!settings.paymentTransferEnabled
      : !!settings.paymentCreditEnabled,
  })), [settings.paymentCashEnabled, settings.paymentTransferEnabled, settings.paymentCreditEnabled]);

  const deliveryOptions = useMemo(() => DELIVERY_METHOD_OPTIONS.map((o) => ({
    ...o,
    enabled: o.id === 'personal' ? settings.deliveryPersonalEnabled !== false : false,
  })), [settings.deliveryPersonalEnabled]);

  const enabledPayments = paymentOptions.filter((o) => o.enabled);
  const enabledDeliveries = deliveryOptions.filter((o) => o.enabled);
  const onlyCashOpen = enabledPayments.length === 1 && enabledPayments[0]?.id === 'cash';
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    return onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    if (!paymentMethod && enabledPayments.length === 1) setPaymentMethod(enabledPayments[0].id);
    if (paymentMethod && !enabledPayments.some((o) => o.id === paymentMethod)) setPaymentMethod('');
  }, [enabledPayments, paymentMethod]);

  useEffect(() => {
    if (!deliveryMethod && enabledDeliveries.length === 1) setDeliveryMethod(enabledDeliveries[0].id);
    if (deliveryMethod && !enabledDeliveries.some((o) => o.id === deliveryMethod)) setDeliveryMethod('');
  }, [enabledDeliveries, deliveryMethod]);

  const oversold = cart.some((item) => {
    const p = products.find((x) => x.id === item.productId);
    return p && item.quantity > p.stock;
  });

  const checkout = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    if (!userData?.isProfileComplete) { setProfileModalOpen(true); return; }
    if (!deliveryMethod) { setError('請選擇配送方式'); return; }
    if (!paymentMethod) { setError('請選擇付款方式'); return; }
    if (!enabledPayments.some((o) => o.id === paymentMethod)) { setError('此付款方式尚未開放'); return; }
    if (!enabledDeliveries.some((o) => o.id === deliveryMethod)) { setError('此配送方式尚未開放'); return; }
    if (!deliveryDate) { setError('請選擇配送日期'); return; }
    if (!deliveryTime) { setError('請選擇配送時間'); return; }
    setError(''); setSuccess(''); setChecking(true);

    const paymentLabel = PAYMENT_METHOD_OPTIONS.find((o) => o.id === paymentMethod)?.label || paymentMethod;
    const deliveryLabel = DELIVERY_METHOD_OPTIONS.find((o) => o.id === deliveryMethod)?.label || deliveryMethod;

    try {
      const orderRef = doc(collection(db, 'orders'));
      const now = new Date().toISOString();
      await runTransaction(db, async (tx) => {
        const snaps = await Promise.all(cart.map((item) => tx.get(doc(db, 'products', item.productId))));
        snaps.forEach((snap, i) => {
          const item = cart[i];
          if (!snap.exists()) throw new Error(`「${item.name}」已下架`);
          if (item.quantity > snap.data().stock) throw new Error(`「${item.name}」庫存不足，僅剩 ${snap.data().stock} 份`);
        });
        snaps.forEach((snap, i) => {
          const item = cart[i];
          const stock = snap.data().stock;
          tx.update(doc(db, 'products', item.productId), { stock: Math.max(0, stock - item.quantity), updatedAt: now });
        });
        tx.set(orderRef, {
          userId: user.uid,
          customerName: userData.name,
          customerPhone: userData.phone,
          customerEmail: user.email || '',
          billingAddress: userData.billingAddress,
          shippingAddress: userData.shippingAddress,
          deliveryDate,
          deliveryTime,
          paymentMethod: paymentLabel,
          deliveryMethod: deliveryLabel,
          items: cart,
          total: cartTotal,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
      });

      const order = {
        id: orderRef.id,
        customerName: userData.name,
        customerPhone: userData.phone,
        customerEmail: user.email || '',
        billingAddress: userData.billingAddress,
        shippingAddress: userData.shippingAddress,
        deliveryDate,
        deliveryTime,
        paymentMethod: paymentLabel,
        deliveryMethod: deliveryLabel,
        items: [...cart],
        total: cartTotal,
        createdAt: now,
      };

      await notifyOrderPlaced(order);
      clearCart();
      setSuccess('done');
      setTimeout(() => navigate('/orders'), 2500);
    } catch (e: any) {
      setError(e.message || '結帳失敗，請稍後再試');
    } finally {
      setChecking(false);
    }
  };

  const chip = (active: boolean, disabled: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
      disabled
        ? 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
        : active
          ? 'bg-[var(--color-ink)] text-[#f0d2b0] border-[var(--color-ink)]'
          : 'bg-white text-stone-600 border-stone-200 hover:border-amber-400'
    }`;

  if (!cart.length && !success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <ShoppingCart className="w-16 h-16 text-stone-300 mb-4" />
        <h2 className="text-xl font-black text-stone-800 mb-2">{texts.cartEmptyTitle}</h2>
        <p className="text-sm text-stone-500 mb-6">{texts.cartEmptyDesc}</p>
        <button type="button" onClick={() => navigate('/')} className="bg-amber-600 text-white font-bold px-8 py-3 rounded-xl">{texts.cartGoMenu}</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full pb-28">
      <div className="flex items-end justify-between mb-3">
        <h1 className="font-display text-xl font-bold text-[var(--color-ink)] tracking-wide">{texts.cartTitle}</h1>
        {cart.length > 0 && (
          <p className="text-xs font-bold text-stone-400">{cart.length} 項 · 共 {itemCount} 份</p>
        )}
      </div>

      {error && (
        <div className="bg-[#fdf2ef] border border-[#f0d5ce] text-[#b5452c] px-3 py-2.5 rounded-xl mb-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}
      {success && (
        <div className="bg-[#eef6ef] border border-[#cfe3d1] text-[#2f6b3a] p-4 rounded-xl mb-3 flex items-start gap-3 fade-up">
          <CheckCircle className="w-5 h-5 shrink-0 text-[#3d8b4a]" />
          <div>
            <p className="font-display font-bold text-sm">{texts.checkoutSuccessTitle}</p>
            <p className="text-xs mt-1 text-[#3d6b45]">{texts.checkoutSuccessContact}</p>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <>
          {/* 商品清單：品項多時可捲動，不把整頁撐很長 */}
          <div className="bg-white rounded-2xl border border-stone-200 mb-3 overflow-hidden">
            <div className={`divide-y divide-stone-100 ${cart.length > 5 ? 'max-h-64 overflow-y-auto' : ''}`}>
              {cart.map((item) => {
                const stock = products.find((p) => p.id === item.productId)?.stock ?? 999;
                const over = item.quantity > stock;
                const soldOut = stock <= 0;
                return (
                  <div key={item.productId} className={`px-3 py-2.5 flex items-center gap-2 ${over || soldOut ? 'bg-red-50/50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-800 text-sm truncate">{item.name}</p>
                      <p className="text-[11px] text-stone-400">
                        ${item.price}
                        {soldOut ? ' · 缺貨' : over ? ` · 剩 ${stock}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5 shrink-0">
                      <button type="button" onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="w-7 h-7 flex items-center justify-center rounded-md bg-white"><Minus className="w-3 h-3" /></button>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, stock)}
                        value={item.quantity}
                        disabled={soldOut}
                        onChange={(e) => {
                          const n = Math.floor(Number(e.target.value));
                          if (!Number.isFinite(n)) return;
                          updateQuantity(item.productId, Math.min(Math.max(1, n), Math.max(1, stock)));
                        }}
                        className="w-9 text-center font-bold text-xs bg-white rounded-md border border-stone-200 py-1 focus:outline-none disabled:opacity-40"
                      />
                      <button type="button" disabled={soldOut || item.quantity >= stock} onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-white disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                    </div>
                    <p className="font-bold text-stone-800 text-sm w-12 text-right shrink-0">${(item.price * item.quantity).toFixed(0)}</p>
                    <button type="button" onClick={() => removeFromCart(item.productId)} className="text-stone-300 hover:text-red-500 p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 結帳資訊合併成一塊，減少卡片堆疊 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-3.5 space-y-3.5 mb-3">
            {userData?.isProfileComplete && (
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-stone-400 mb-0.5">收件人</p>
                  <p className="text-sm font-bold text-stone-800">{userData.name} · {userData.phone}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{userData.shippingAddress}</p>
                </div>
                <button type="button" onClick={() => setProfileModalOpen(true)} className="text-[11px] text-amber-600 font-bold shrink-0">修改</button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-stone-400">配送方式 *</p>
                <p className="text-[10px] text-stone-400">本人親自送達</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deliveryOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!opt.enabled}
                    onClick={() => setDeliveryMethod(opt.id)}
                    className={chip(deliveryMethod === opt.id, !opt.enabled)}
                  >
                    {opt.label}{!opt.enabled ? '（未開放）' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-stone-400">付款方式 *</p>
                {onlyCashOpen && <p className="text-[10px] font-bold text-amber-700">目前只接受現金</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!opt.enabled}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={chip(paymentMethod === opt.id, !opt.enabled)}
                  >
                    {opt.label}{!opt.enabled ? '（未開放）' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-stone-400 mb-1.5">{texts.deliveryTitle} *</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={minDeliveryDate()}
                  max={maxDeliveryDate()}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <select
                  required
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="">選擇時段</option>
                  {DELIVERY_TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 底部固定結帳列，不用一直往下找按鈕 */}
          <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 px-3 pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto surface-warm border border-[#eadfce] rounded-2xl shadow-[0_12px_40px_-12px_rgba(28,20,16,0.35)] p-3.5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-[10px] text-[#9a8674]">{texts.checkoutNote || '結帳後商家會盡速為您安排送貨'}</p>
                  <p className="font-display text-2xl font-bold text-[var(--color-copper)] leading-tight">${cartTotal.toFixed(0)}</p>
                </div>
                <button
                  type="button"
                  onClick={checkout}
                  disabled={checking || oversold || !deliveryDate || !deliveryTime || !paymentMethod || !deliveryMethod}
                  className="btn-ink font-bold px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-40 shrink-0 text-sm"
                >
                  {checking ? <><Loader2 className="w-4 h-4 animate-spin" />處理中</> : <><span>{texts.checkoutBtn}</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
