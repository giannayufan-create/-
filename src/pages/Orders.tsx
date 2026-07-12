import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useStore } from '../lib/store';
import { format } from 'date-fns';

export default function Orders() {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
      // Note: Firestore requires an index for where + orderBy. For simplicity in this demo, we'll sort client-side.
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(docs);
    });

    return () => unsub();
  }, [user]);

  if (!user) {
    return <div className="text-center py-12">Please sign in to view your orders.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">歷史訂單紀錄</h1>
          <p className="text-slate-500 mt-1">追蹤您的訂單狀態與下載收據。</p>
        </div>
      </header>
      
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                <th className="py-2">訂單編號</th>
                <th className="py-2">日期</th>
                <th className="py-2">項目</th>
                <th className="py-2">總額</th>
                <th className="py-2">狀態</th>
                <th className="py-2 text-right">發票明細</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {orders.map(order => (
                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-mono font-bold text-slate-700">#{order.id.slice(0, 8)}</td>
                  <td className="py-4 text-slate-600">{format(new Date(order.createdAt), 'yyyy.MM.dd HH:mm')}</td>
                  <td className="py-4 text-slate-600 max-w-xs truncate">
                    {order.items.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}
                  </td>
                  <td className="py-4 font-bold text-slate-800">${order.total.toFixed(2)}</td>
                  <td className="py-4">
                    {order.status === 'processed' ? (
                       <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">已寄出</span>
                    ) : order.status === 'processing' ? (
                       <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">處理中</span>
                    ) : (
                       <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">等待中</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {order.status === 'processed' ? (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 寄至信箱</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">處理後自動寄出</span>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                      </div>
                      <p className="text-slate-500 font-medium">您目前沒有訂單紀錄</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
