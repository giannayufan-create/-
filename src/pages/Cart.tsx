import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../lib/store';
import { notifyOrderPlaced } from '../lib/orderNotify';
import { DELIVERY_TIME_SLOTS, minDeliveryDate, maxDeliveryDate } from '../lib/deliverySlots';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, AlertCircle, Loader2, CheckCircle, Calendar, Wallet, Truck } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto w-full">
      <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] mb-6 tracking-wide">{texts.cartTitle}</h1>

      {error && (
        <div className="bg-[#fdf2ef] border border-[#f0d5ce] text-[#b5452c] p-4 rounded-xl mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-[#eef6ef] border border-[#cfe3d1] text-[#2f6b3a] p-5 rounded-xl mb-4 flex items-start gap-3 fade-up">
          <CheckCircle className="w-6 h-6 shrink-0 text-[#3d8b4a]" />
          <div>
            <p className="font-display font-bold text-base">{texts.checkoutSuccessTitle}</p>
            <p className="text-sm mt-1.5 text-[#3d6b45]">{texts.checkoutSuccessContact}</p>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 mb-6">
            {cart.map((item) => {
              const stock = products.find((p) => p.id === item.productId)?.stock ?? 999;
              const over = item.quantity > stock;
              const soldOut = stock <= 0;
              return (
                <div key={item.productId} className={`p-4 flex items-center gap-4 ${over || soldOut ? 'bg-red-50/50' : ''}`}>
                  <div className="flex-1">
                    <p className="font-bold text-stone-800">{item.name}</p>
                    <p className="text-xs text-stone-500">${item.price} / 份</p>
                    {soldOut && <p className="text-xs text-red-600 font-bold mt-1">目前缺貨中</p>}
                    {!soldOut && over && <p className="text-xs text-red-600 font-bold mt-1">庫存僅剩 {stock} 份</p>}
                  </div>
                  <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
                    <button type="button" onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white"><Minus className="w-3.5 h-3.5" /></button>
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
                      className="w-12 text-center font-bold text-sm bg-white rounded-lg border border-stone-200 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-40"
                    />
                    <button type="button" disabled={soldOut || item.quantity >= stock} onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="font-bold text-stone-800 w-16 text-right">${(item.price * item.quantity).toFixed(0)}</p>
                  <button type="button" onClick={() => removeFromCart(item.productId)} className="text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>

          {userData?.isProfileComplete && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4 text-sm">
              <p className="font-bold text-stone-700 mb-2">配送資訊</p>
              <p className="text-stone-600">{userData.name} · {userData.phone}</p>
              <p className="text-stone-500 text-xs mt-1">{userData.shippingAddress}</p>
              <button type="button" onClick={() => setProfileModalOpen(true)} className="text-xs text-amber-600 font-bold mt-2">修改 →</button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <p className="font-bold text-stone-700 mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              配送方式 <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-stone-500 mb-3">目前僅提供本人親自送達</p>
            <div className="space-y-2">
              {deliveryOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold ${
                    !opt.enabled
                      ? 'border-stone-100 bg-stone-50 text-stone-400 cursor-not-allowed'
                      : deliveryMethod === opt.id
                        ? 'border-amber-400 bg-amber-50 text-amber-900 cursor-pointer'
                        : 'border-stone-200 bg-white text-stone-700 cursor-pointer hover:border-amber-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    className="accent-amber-600"
                    disabled={!opt.enabled}
                    checked={deliveryMethod === opt.id}
                    onChange={() => setDeliveryMethod(opt.id)}
                  />
                  <span className="flex-1">{opt.label}</span>
                  {!opt.enabled && <span className="text-[10px] font-bold text-stone-400">尚未開放</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <p className="font-bold text-stone-700 mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-600" />
              付款方式 <span className="text-red-500">*</span>
            </p>
            {onlyCashOpen && (
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                目前只接受現金
              </p>
            )}
            <div className="space-y-2">
              {paymentOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold ${
                    !opt.enabled
                      ? 'border-stone-100 bg-stone-50 text-stone-400 cursor-not-allowed'
                      : paymentMethod === opt.id
                        ? 'border-amber-400 bg-amber-50 text-amber-900 cursor-pointer'
                        : 'border-stone-200 bg-white text-stone-700 cursor-pointer hover:border-amber-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="accent-amber-600"
                    disabled={!opt.enabled}
                    checked={paymentMethod === opt.id}
                    onChange={() => setPaymentMethod(opt.id)}
                  />
                  <span className="flex-1">{opt.label}</span>
                  {!opt.enabled && <span className="text-[10px] font-bold text-stone-400">尚未開放</span>}
                  {opt.enabled && opt.id === 'cash' && onlyCashOpen && (
                    <span className="text-[10px] font-bold text-amber-700">目前可選</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6">
            <p className="font-bold text-stone-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              {texts.deliveryTitle} <span className="text-red-500">*</span>
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">{texts.deliveryDateLabel}</label>
                <input type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                  min={minDeliveryDate()} max={maxDeliveryDate()}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">{texts.deliveryTimeLabel}</label>
                <select required value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none">
                  <option value="">請選擇時間</option>
                  {DELIVERY_TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="surface-warm rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-[#6b5648]">總計</span>
              <span className="font-display text-3xl font-bold text-[var(--color-copper)]">${cartTotal.toFixed(0)}</span>
            </div>
            <p className="text-xs text-[#9a8674] mb-4">{texts.checkoutNote || '結帳後商家會盡速為您安排送貨'}</p>
            <button
              type="button"
              onClick={checkout}
              disabled={checking || oversold || !deliveryDate || !deliveryTime || !paymentMethod || !deliveryMethod}
              className="w-full btn-ink font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {checking ? <><Loader2 className="w-5 h-5 animate-spin" />處理中...</> : <><span>{texts.checkoutBtn}</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
