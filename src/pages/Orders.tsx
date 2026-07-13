import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { Download, Calendar } from 'lucide-react';
import { downloadOrdersListCsv } from '../lib/orderExport';
import { useSiteSettings } from '../lib/useSettings';

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '等待處理', color: 'bg-amber-50 text-amber-700' },
  processing: { label: '處理中', color: 'bg-blue-50 text-blue-700' },
  processed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: '已取消', color: 'bg-red-50 text-red-700' },
};

export default function Orders() {
  const { user, setAuthModalOpen } = useStore();
  const { texts } = useSiteSettings();
  const [orders, setOrders] = useState<any[]>([]);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    return onSnapshot(q, (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(docs);
    });
  }, [user]);

  const years = useMemo(() => {
    const set = new Set(orders.map((o) => new Date(o.createdAt).getFullYear().toString()));
    return ['', ...Array.from(set).sort().reverse()];
  }, [orders]);

  const filtered = orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (year && d.getFullYear().toString() !== year) return false;
    if (month && (d.getMonth() + 1).toString().padStart(2, '0') !== month) return false;
    return true;
  });

  const activeOrders = filtered.filter((o) => o.status !== 'cancelled');
  const totalSpent = activeOrders.reduce((s, o) => s + (o.total || 0), 0);

  const handleDownload = () => {
    if (!activeOrders.length) return;
    const label = year && month ? `${year}年${month}月` : year ? `${year}年` : '全部';
    downloadOrdersListCsv(activeOrders, `我的訂單_${label}.csv`);
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <p className="text-4xl mb-3">📦</p>
        <h2 className="text-xl font-black text-stone-800 mb-2">請先登入</h2>
        <p className="text-sm text-stone-500 mb-4">登入後即可查看訂單紀錄</p>
        <button onClick={() => setAuthModalOpen(true)} className="bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">登入帳號</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-black text-stone-900">{texts.ordersTitle}</h1>
        <button onClick={handleDownload} disabled={!activeOrders.length}
          className="flex items-center gap-2 bg-stone-900 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40">
          <Download className="w-4 h-4" />下載訂單 CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white border border-stone-200 rounded-xl p-3 mb-6">
        <Calendar className="w-4 h-4 text-amber-600" />
        <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold">
          <option value="">全部年份</option>
          {years.filter(Boolean).map((y) => <option key={y} value={y}>{y} 年</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold">
          <option value="">全部月份</option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>{m} 月</option>)}
        </select>
        {(year || month) && (
          <button onClick={() => { setYear(''); setMonth(''); }} className="text-xs text-amber-600 font-bold hover:underline">清除</button>
        )}
        <span className="ml-auto text-xs text-stone-500">
          {filtered.length} 筆訂單 · 有效金額 ${totalSpent}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-200">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-bold text-stone-700">{orders.length === 0 ? texts.ordersEmpty : '此期間沒有訂單'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-mono font-bold text-stone-700 text-sm">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-stone-400">{format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm')}</p>
                  {o.deliveryDate && (
                    <p className="text-xs text-amber-700 font-bold mt-1">配送：{o.deliveryDate} {o.deliveryTime}</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS[o.status]?.color || ''}`}>
                  {STATUS[o.status]?.label || o.status}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                {o.items?.map((i: any) => (
                  <p key={i.productId} className="text-sm text-stone-600">{i.name} × {i.quantity} <span className="text-stone-400">${i.price * i.quantity}</span></p>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-400">送至：{o.shippingAddress}</p>
                <p className={`font-black text-lg ${o.status === 'cancelled' ? 'text-stone-400 line-through' : 'text-amber-600'}`}>
                  ${o.total}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
