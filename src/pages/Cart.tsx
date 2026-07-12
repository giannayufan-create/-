import { useStore } from '../lib/store';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Cart() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, user } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      alert('Please sign in to checkout');
      return;
    }
    
    setIsCheckingOut(true);
    try {
      const { userData } = useStore.getState();
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        customerName: userData?.name || user.displayName || 'Unknown',
        customerPhone: userData?.phone || '',
        billingAddress: userData?.billingAddress || '',
        shippingAddress: userData?.shippingAddress || '',
        customerEmail: user.email,
        items: cart,
        total: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to place order.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
           <ShoppingCart className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">您的購物車是空的</h2>
        <p className="text-slate-500 mb-8">前往商品目錄選購一些美味餐點吧！</p>
        <button onClick={() => navigate('/')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/20 transition-all">前往選購</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">購物車</h1>
          <p className="text-slate-500 mt-1">確認您的訂單項目並結帳。</p>
        </div>
      </header>
      
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
        <ul className="divide-y divide-slate-100 flex-1 overflow-y-auto">
          {cart.map((item) => (
            <li key={item.productId} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                <p className="text-slate-500 font-medium">${item.price.toFixed(2)} / 件</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-6 text-center text-slate-800">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="w-24 text-right font-bold text-slate-900 text-lg">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
                
                <button onClick={() => removeFromCart(item.productId)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="p-8 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <span className="text-lg font-bold text-slate-500">總計金額</span>
            <span className="text-4xl font-bold text-emerald-700">${cartTotal.toFixed(2)}</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            {isCheckingOut ? '處理訂單中...' : '確認結帳並送出訂單'}
          </button>
        </div>
      </div>
    </div>
  );
}
