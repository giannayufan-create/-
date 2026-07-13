import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { Search, Calendar } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待處理', color: 'bg-amber-50 text-amber-700' },
  processing: { label: '處理中', color: 'bg-blue-50 text-blue-700' },
  processed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: '已取消', color: 'bg-red-50 text-red-700' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'orders'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(docs);
    });
  }, []);

  const years = useMemo(() => {
    const set = new Set(orders.map((o) => new Date(o.createdAt).getFullYear().toString()));
    return ['', ...Array.from(set).sort().reverse()];
  }, [orders]);

  const changeStatus = async (orderId: string, newStatus: string, order: any) => {
    const prevStatus = order.status;
    await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: new Date().toISOString() });

    if (newStatus === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of order.items || []) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          await updateDoc(pRef, {
            stock: (pSnap.data().stock || 0) + item.quantity,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (newStatus === 'processed' && prevStatus !== 'processed' && prevStatus !== 'cancelled') {
      const uRef = doc(db, 'users', order.userId);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        await updateDoc(uRef, { points: (uSnap.data().points || 0) + Math.floor(order.total), updatedAt: new Date().toISOString() });
      }
    }

    if (newStatus === 'cancelled' && prevStatus === 'processed') {
      const uRef = doc(db, 'users', order.userId);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        await updateDoc(uRef, {
          points: Math.max(0, (uSnap.data().points || 0) - Math.floor(order.total)),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    const d = new Date(o.createdAt);
    if (year && d.getFullYear().toString() !== year) return false;
    if (month && (d.getMonth() + 1).toString().padStart(2, '0') !== month) return false;
    if (day && d.getDate().toString().padStart(2, '0') !== day) return false;
    const q = search.toLowerCase();
    return !q || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q) || o.id.includes(q);
  });

  const totalAmount = filtered
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);
  const cancelledCount = filtered.filter((o) => o.status === 'cancelled').length;

  return (
    <div>
      <h1 className="text-2xl font-black text-stone-900 mb-1">訂單管理</h1>
      <p className="text-sm text-stone-500 mb-6">可依年/月/日篩選查找訂單</p>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋姓名、電話、訂單編號..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold">
            <option value="all">全部狀態</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white border border-stone-200 rounded-xl p-3">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-stone-600">日期篩選：</span>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold">
            <option value="">全部年份</option>
            {years.filter(Boolean).map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold">
            <option value="">全部月份</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>{m} 月</option>)}
          </select>
          <select value={day} onChange={(e) => setDay(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold">
            <option value="">全部日期</option>
            {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => <option key={d} value={d}>{d} 日</option>)}
          </select>
          {(year || month || day) && (
            <button onClick={() => { setYear(''); setMonth(''); setDay(''); }} className="text-xs text-amber-600 font-bold hover:underline">清除日期</button>
          )}
          <span className="ml-auto text-xs text-stone-500">
            {filtered.length} 筆 · 有效合計 ${totalAmount}
            {cancelledCount > 0 && <span className="text-red-500"> · {cancelledCount} 筆已取消不計</span>}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-100 bg-stone-50">
                <th className="text-left p-4">訂單</th>
                <th className="text-left p-4">客戶</th>
                <th className="text-left p-4">商品</th>
                <th className="text-left p-4">金額</th>
                <th className="text-left p-4">狀態</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                  <td className="p-4">
                    <p className="font-mono font-bold text-stone-700">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-stone-400">{format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm')}</p>
                    {o.deliveryDate && <p className="text-xs text-amber-700 font-bold">配送 {o.deliveryDate} {o.deliveryTime}</p>}
                  </td>
                  <td className="p-4">
                    <p className="font-bold">{o.customerName}</p>
                    <p className="text-xs text-stone-500">{o.customerPhone}</p>
                    <p className="text-xs text-stone-400 truncate max-w-[180px]">{o.shippingAddress}</p>
                  </td>
                  <td className="p-4 text-xs text-stone-600">
                    {o.items?.map((i: any) => <p key={i.productId}>{i.name} × {i.quantity}（${i.price * i.quantity}）</p>)}
                  </td>
                  <td className="p-4 font-black text-emerald-700">
                    {o.status === 'cancelled' ? (
                      <span className="text-stone-400 line-through">${o.total}</span>
                    ) : (
                      `$${o.total}`
                    )}
                  </td>
                  <td className="p-4">
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value, o)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer ${STATUS_MAP[o.status]?.color || ''}`}>
                      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-stone-400 py-12">沒有符合條件的訂單</p>}
      </div>
    </div>
  );
}
