import { useStore } from '../lib/store';
import { Minus, Plus, Trash2, ShoppingCart, AlertCircle, User, Phone, MapPin, Edit, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Cart() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, user, userData, setAuthModalOpen, setProfileModalOpen } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [checkoutError, setCheckoutError] = useState<string>('');
  const navigate = useNavigate();

  // Listen to live products database to cross-reference stock levels in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error listening to products:', error);
    });
    return () => unsub();
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    
    const { userData: currentUsersData } = useStore.getState();
    if (!currentUsersData || !currentUsersData.isProfileComplete) {
       setProfileModalOpen(true);
       return;
    }

    setCheckoutError('');
    setIsCheckingOut(true);

    try {
      // 1. Transactional Pre-check: Fetch fresh stock from Firestore for each cart item
      const outOfStockItems: string[] = [];
      const { cart: currentCart } = useStore.getState();

      for (const item of currentCart) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const freshStock = productSnap.data().stock;
          if (item.quantity > freshStock) {
            outOfStockItems.push(`【${item.name}】您點購了 ${item.quantity} 份，但目前現貨僅剩 ${freshStock} 份`);
          }
        } else {
          outOfStockItems.push(`【${item.name}】此商品可能已下架或不存在`);
        }
      }
      
      // If any item is out of stock, block the checkout and alert the user
      if (outOfStockItems.length > 0) {
        setCheckoutError(`結帳失敗！有商品庫存不足或狀態變更，請調整數量後再結帳：\n\n${outOfStockItems.join('\n')}`);
        setIsCheckingOut(false);
        return;
      }

      // 2. All products are verified to have enough stock. Proceed with creating order
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        customerName: currentUsersData?.name || user.displayName || 'Unknown',
        customerPhone: currentUsersData?.phone || '',
        billingAddress: currentUsersData?.billingAddress || '',
        shippingAddress: currentUsersData?.shippingAddress || '',
        customerEmail: user.email,
        items: currentCart,
        total: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      clearCart();
      navigate('/orders');
    } catch (error: any) {
      console.error('Checkout error:', error);
      setCheckoutError(`送出訂單發生錯誤: ${error.message || '請聯絡客服處理。'}`);
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
          <p className="text-slate-500 mt-1">確認您的訂單項目、物流資訊並結帳。</p>
        </div>
      </header>
      
      {checkoutError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl mb-6 flex items-start gap-3.5 animate-in fade-in duration-300">
          <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-bold leading-relaxed whitespace-pre-line">
            {checkoutError}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col mb-8">
        <ul className="divide-y divide-slate-100 flex-1 overflow-y-auto">
          {cart.map((item) => {
            const matchedProduct = products.find(p => p.id === item.productId);
            const liveStock = matchedProduct ? matchedProduct.stock : 999;
            const isAtMaxStock = item.quantity >= liveStock;
            const isOversold = item.quantity > liveStock;

            return (
              <li key={item.productId} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/50 transition-colors gap-4 ${isOversold ? 'bg-red-50/30' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                    {isOversold && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">庫存超限</span>
                    )}
                  </div>
                  <p className="text-slate-500 font-medium text-xs mt-0.5">${item.price.toFixed(2)} / 件</p>
                  
                  {isOversold ? (
                    <p className="text-red-500 text-xs font-bold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      ⚠️ 庫存不足！目前剩餘庫存僅有 {liveStock} 份，請降低數量後結帳。
                    </p>
                  ) : liveStock <= 5 && liveStock > 0 ? (
                    <p className="text-amber-600 text-[11px] font-bold mt-1.5">
                      ⚠️ 熱門品項，剩餘庫存僅有 {liveStock} 份
                    </p>
                  ) : null}
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} 
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold w-6 text-center text-slate-800">{item.quantity}</span>
                    <button 
                      disabled={isAtMaxStock}
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)} 
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-emerald-600 transition-colors disabled:opacity-30 disabled:hover:text-slate-500"
                    >
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
            );
          })}
        </ul>
        
        <div className="p-8 bg-slate-50 border-t border-slate-200">
          
          {/* Real-time Order delivery info pre-confirmation (Foolproofing 3) */}
          {user && userData && (
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl mb-6 shadow-sm">
              <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  外送、收件資訊確認 (結帳防呆核對)
                </h4>
                <button 
                  onClick={() => setProfileModalOpen(true)} 
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  修改資訊
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16">收件姓名:</span>
                  <span className="font-black text-slate-800">{userData.name || '尚未設定'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16">聯絡電話:</span>
                  <span className="font-black text-slate-800">{userData.phone || '尚未設定'}</span>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <span className="font-bold text-slate-400 w-16 flex-shrink-0">送貨地址:</span>
                  <span className="font-black text-slate-800 truncate" title={userData.shippingAddress}>{userData.shippingAddress || '尚未設定'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <span className="text-lg font-bold text-slate-500">總計金額</span>
            <span className="text-4xl font-bold text-emerald-700">${cartTotal.toFixed(2)}</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut || cart.some(item => {
              const matchedProduct = products.find(p => p.id === item.productId);
              return matchedProduct ? item.quantity > matchedProduct.stock : false;
            })}
            className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-slate-900/10"
          >
            {isCheckingOut ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>正在向資料庫驗證庫存並結帳中...</span>
              </>
            ) : (
              <>
                <span>確認結帳並送出訂單</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
