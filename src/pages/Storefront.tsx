import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useStore } from '../lib/store';
import { Plus } from 'lucide-react';

export default function Storefront() {
  const [products, setProducts] = useState<any[]>([]);
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

  return (
    <div className="flex-1 flex flex-col">
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
                  onClick={() => addToCart({ productId: product.id, name: product.name, price: product.price, quantity: 1 })}
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
          <div className="col-span-full text-center py-12 text-slate-500 font-medium">
            No products available right now.
          </div>
        )}
      </div>
    </div>
  );
}
