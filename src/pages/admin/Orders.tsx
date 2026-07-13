import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, isToday, isThisMonth } from 'date-fns';
import {
  Search, Calendar, Download, ChevronDown, ChevronUp,
  Clock, CheckCircle, XCircle, Truck, DollarSign, Package,
} from 'lucide-react';
import { downloadAdminOrdersCsv } from '../../lib/orderExport';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '待處理', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  processing: { label: '處理中', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
  processed: { label: '已完成', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

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
          await updateDoc(pRef, { stock: (pSnap.data().stock || 0) + item.quantity, updatedAt: new Date().toISOString() });
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
        await updateDoc(uRef, { points: Math.max(0, (uSnap.data().points || 0) - Math.floor(order.total)), updatedAt: new Date().toISOString() });
      }
    }
  };

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    const d = new Date(o.createdAt);
    if (year && d.getFullYear().toString() !== year) return false;
    if (month && (d.getMonth() + 1).toString().padStart(2, '0') !== month) return false;
    if (day && d.getDate().toString().padStart(2, '0') !== day) return false;
    if (deliveryFilter && o.deliveryDate !== deliveryFilter) return false;
    const q = search.toLowerCase();
    return !q || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q) || o.id.includes(q);
  });

  const active = filtered.filter((o) => o.status !== 'cancelled');
  const totalAmount = active.reduce((s, o) => s + (o.total || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const todayCount = orders.filter((o) => isToday(new Date(o.createdAt))).length;
  const monthRevenue = orders
    .filter((o) => o.status !== 'cancelled' && isThisMonth(new Date(o.createdAt)))
    .reduce((s, o) => s + (o.total || 0), 0);

  const handleDownload = () => {
    const label = [year, month, day].filter(Boolean).join('-') || '全部';
    downloadAdminOrdersCsv(filtered, `訂單管理_${label}.csv`);
  };

  const stats = [
    { label: '待處理', value: pendingCount, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: '今日訂單', value: todayCount, icon: Package, color: 'text-blue-600 bg-blue-50' },
    { label: '本月營收', value: `$${monthRevenue}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: '篩選合計', value: `$${totalAmount}`, icon: DollarSign, color: 'text-stone-700 bg-stone-100' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 mb-1">訂單智慧管理</h1>
          <p className="text-sm text-stone-500">快速篩選、一鍵更新狀態、下載報表</p>
        </div>
        <button onClick={handleDownload} disabled={!filtered.length}
          className="flex items-center gap-2 bg-stone-900 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-colors">
          <Download className="w-4 h-4" />下載 CSV（{filtered.length} 筆）
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">{s.label}</p>
              <p className="text-lg font-black text-stone-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋姓名、電話、訂單編號..."
            className="w-full pl-9 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ k: 'all', l: '全部' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ k, l: v.label }))].map((s) => (
            <button key={s.k} onClick={() => setFilter(s.k)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${filter === s.k ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'}`}>
              {s.l}{s.k !== 'all' && ` (${orders.filter((o) => o.status === s.k).length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white border border-stone-200 rounded-xl p-3">
          <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
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
          <input type="date" value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold" title="配送日期" />
          {(year || month || day || deliveryFilter) && (
            <button onClick={() => { setYear(''); setMonth(''); setDay(''); setDeliveryFilter(''); }} className="text-xs text-amber-600 font-bold hover:underline">清除篩選</button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => {
          const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
          const isOpen = expanded === o.id;
          const cancelled = o.status === 'cancelled';
          return (
            <div key={o.id} className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${cancelled ? 'border-stone-200 opacity-80' : 'border-stone-200'}`}>
              <div className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-stone-800">#{o.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-sm font-bold text-stone-800 mt-1">{o.customerName} · {o.customerPhone}</p>
                  <p className="text-xs text-stone-500">{format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm')}
                    {o.deliveryDate && <span className="text-amber-700 font-bold ml-2">配送 {o.deliveryDate} {o.deliveryTime}</span>}
                    {o.deliveryMethod && <span className="text-stone-500 ml-2">· {o.deliveryMethod}</span>}
                    {o.paymentMethod && <span className="text-stone-500 ml-2">· 付款 {o.paymentMethod}</span>}
                  </p>
                </div>
                <p className={`text-xl font-black ${cancelled ? 'text-stone-400 line-through' : 'text-emerald-700'}`}>${o.total}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <button key={k} onClick={() => changeStatus(o.id, k, o)} disabled={o.status === k}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${o.status === k ? v.color : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-amber-300'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setExpanded(isOpen ? null : o.id)} className="p-2 text-stone-400 hover:text-amber-600">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-stone-100 bg-stone-50/50 pt-3 space-y-2 text-sm">
                  <p className="text-stone-600"><span className="font-bold">地址：</span>{o.shippingAddress}</p>
                  {o.customerEmail && <p className="text-stone-600"><span className="font-bold">Email：</span>{o.customerEmail}</p>}
                  <div className="bg-white rounded-xl p-3 border border-stone-100">
                    <p className="text-xs font-bold text-stone-500 mb-2">訂購明細</p>
                    {o.items?.map((i: any) => (
                      <p key={i.productId} className="text-stone-700">{i.name} × {i.quantity}　<span className="text-amber-700 font-bold">${i.price * i.quantity}</span></p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-stone-200 py-16 text-center text-stone-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-bold">沒有符合條件的訂單</p>
          </div>
        )}
      </div>
    </div>
  );
}
