import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, isToday, isThisMonth } from 'date-fns';
import {
  Search, Calendar, Download, ChevronDown, ChevronUp, Printer,
  Clock, CheckCircle, XCircle, Truck, DollarSign, Package,
} from 'lucide-react';
import { downloadAdminOrdersCsv } from '../../lib/orderExport';
import { printOrderSlip } from '../../lib/printOrder';
import { getSettingsSnapshot } from '../../lib/settingsCache';

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
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

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

  const saveNote = async (orderId: string) => {
    const note = (noteDrafts[orderId] ?? orders.find((o) => o.id === orderId)?.adminNote ?? '').trim();
    await updateDoc(doc(db, 'orders', orderId), { adminNote: note, updatedAt: new Date().toISOString() });
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
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] mb-1">訂單管理</h1>
          <p className="text-sm text-[#7a6555]">篩選、改狀態、內部備註、列印出貨單</p>
        </div>
        <button type="button" onClick={handleDownload} disabled={!filtered.length}
          className="flex items-center gap-2 btn-copper px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">
          <Download className="w-4 h-4" />下載 CSV（{filtered.length} 筆）
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="surface-warm rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#9a8674] uppercase">{s.label}</p>
              <p className="text-lg font-black text-[var(--color-ink)]">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#9a8674] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋姓名、電話、訂單編號..."
            className="w-full pl-9 pr-4 py-3 bg-white border border-[#e8d9c8] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none" />
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ k: 'all', l: '全部' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ k, l: v.label }))].map((s) => (
            <button key={s.k} type="button" onClick={() => setFilter(s.k)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${filter === s.k ? 'bg-[var(--color-copper)] text-white' : 'bg-white border border-[#e8d9c8] text-[#6b5648] hover:border-amber-300'}`}>
              {s.l}{s.k !== 'all' && ` (${orders.filter((o) => o.status === s.k).length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 surface-warm rounded-xl p-3">
          <Calendar className="w-4 h-4 text-[var(--color-copper)] shrink-0" />
          <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-[#faf6f1] border border-[#e8d9c8] rounded-lg px-3 py-1.5 text-sm font-bold">
            <option value="">全部年份</option>
            {years.filter(Boolean).map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-[#faf6f1] border border-[#e8d9c8] rounded-lg px-3 py-1.5 text-sm font-bold">
            <option value="">全部月份</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>{m} 月</option>)}
          </select>
          <select value={day} onChange={(e) => setDay(e.target.value)} className="bg-[#faf6f1] border border-[#e8d9c8] rounded-lg px-3 py-1.5 text-sm font-bold">
            <option value="">全部日期</option>
            {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => <option key={d} value={d}>{d} 日</option>)}
          </select>
          <input type="date" value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)}
            className="bg-[#faf6f1] border border-[#e8d9c8] rounded-lg px-3 py-1.5 text-sm font-bold" title="配送日期" />
          {(year || month || day || deliveryFilter) && (
            <button type="button" onClick={() => { setYear(''); setMonth(''); setDay(''); setDeliveryFilter(''); }} className="text-xs text-[var(--color-copper)] font-bold hover:underline">清除篩選</button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => {
          const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
          const isOpen = expanded === o.id;
          const cancelled = o.status === 'cancelled';
          const noteValue = noteDrafts[o.id] ?? o.adminNote ?? '';
          return (
            <div key={o.id} className={`surface-warm rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${cancelled ? 'opacity-80' : ''}`}>
              <div className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-[var(--color-ink)]">#{o.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                    {o.adminNote && <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">有備註</span>}
                  </div>
                  <p className="text-sm font-bold text-[var(--color-ink)] mt-1">{o.customerName} · {o.customerPhone}</p>
                  <p className="text-xs text-[#7a6555]">{format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm')}
                    {o.deliveryDate && <span className="text-amber-800 font-bold ml-2">配送 {o.deliveryDate} {o.deliveryTime}</span>}
                    {o.deliveryMethod && <span className="ml-2">· {o.deliveryMethod}</span>}
                    {o.paymentMethod && <span className="ml-2">· 付款 {o.paymentMethod}</span>}
                  </p>
                </div>
                <p className={`text-xl font-black ${cancelled ? 'text-[#9a8674] line-through' : 'text-emerald-700'}`}>${o.total}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => changeStatus(o.id, k, o)} disabled={o.status === k}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${o.status === k ? v.color : 'bg-[#faf6f1] border-[#e8d9c8] text-[#6b5648] hover:border-amber-300'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => printOrderSlip(o, getSettingsSnapshot().storeName || '滷味小哥')}
                  className="p-2 text-[#7a6555] hover:text-[var(--color-copper)]"
                  title="列印出貨單"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setExpanded(isOpen ? null : o.id)} className="p-2 text-[#9a8674] hover:text-[var(--color-copper)]">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#f0e6da] bg-[#faf6f1]/50 pt-3 space-y-3 text-sm">
                  <p className="text-[#6b5648]"><span className="font-bold">地址：</span>{o.shippingAddress}</p>
                  {o.customerEmail && <p className="text-[#6b5648]"><span className="font-bold">Email：</span>{o.customerEmail}</p>}
                  <div className="bg-white rounded-xl p-3 border border-[#e8d9c8]">
                    <p className="text-xs font-bold text-[#9a8674] mb-2">訂購明細</p>
                    {o.items?.map((i: any) => (
                      <p key={i.productId} className="text-[var(--color-ink)]">{i.name} × {i.quantity}　<span className="text-[var(--color-copper)] font-bold">${i.price * i.quantity}</span></p>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#e8d9c8] space-y-2">
                    <p className="text-xs font-bold text-[#9a8674]">內部備註（客人看不到）</p>
                    <textarea
                      value={noteValue}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                      rows={2}
                      placeholder="例如：已電話確認、門口請放冷藏箱…"
                      className="w-full bg-[#faf6f1] border border-[#e8d9c8] rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30"
                    />
                    <button type="button" onClick={() => saveNote(o.id)} className="text-xs font-bold text-[var(--color-copper)] hover:underline">
                      儲存備註
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="surface-warm rounded-2xl border-dashed py-16 text-center text-[#9a8674]">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-bold">沒有符合條件的訂單</p>
          </div>
        )}
      </div>
    </div>
  );
}
