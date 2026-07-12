import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useStore } from '../lib/store';
import { Plus } from 'lucide-react';

export default function Storefront() {
  const [products, setProducts] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const { addToCart } = useStore();

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error fetching products:', error);
    });
    return () => unsub();
  }, []);

  const handleAddToCart = (product: any) => {
    addToCart({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
    setToastMessage(`已將 ${product.name} 加入購物車`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <div className="flex-1 flex flex-col relative">
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toastMessage}
        </div>
      )}
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">商品目錄</h1>
          <p className="text-slate-500 mt-1">選購您的商品。</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group flex flex-col">
            <div className="h-40 bg-slate-100 flex items-center justify-center relative">
              {product.stock <= 5 ? (
                <div className="absolute top-3 right-3 bg-red-100 px-2 py-1 rounded text-[10px] font-bold text-red-600 border border-red-200 shadow-sm z-10">低庫存: {product.stock}</div>
              ) : (
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-700 border border-slate-100 shadow-sm z-10">庫存: {product.stock}</div>
              )}
              {product.imageBase64 ? (
                <img src={product.imageBase64} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              )}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-slate-800">{product.name}</h4>
                <span className="text-emerald-600 font-bold italic">${product.price.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{product.description}</p>
              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock <= 0}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 transition-colors text-white text-xs font-bold py-2.5 rounded-lg disabled:opacity-50"
                >
                  {product.stock <= 0 ? '已售完' : '加入購物車'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-500 font-medium bg-white rounded-2xl border border-slate-100 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            目前沒有商品，請稍後再來。
          </div>
        )}
      </div>
    </div>
  );
}
