import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp,
  Package, Calendar, BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isSameMonth, parseISO, subMonths } from 'date-fns';

const STATUS_LABEL: Record<string, string> = {
  pending: '待處理',
  processing: '處理中',
  processed: '已完成',
  cancelled: '已取消',
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'orders'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(docs);
    });
    const u2 = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'users'), (s) => setMembers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const selectedDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const prevDate = useMemo(() => subMonths(selectedDate, 1), [selectedDate]);

  const monthOrders = useMemo(
    () => orders.filter((o) => {
      try { return isSameMonth(parseISO(o.createdAt), selectedDate); } catch { return false; }
    }),
    [orders, selectedDate],
  );

  const prevMonthOrders = useMemo(
    () => orders.filter((o) => {
      try { return isSameMonth(parseISO(o.createdAt), prevDate); } catch { return false; }
    }),
    [orders, prevDate],
  );

  const activeMonth = monthOrders.filter((o) => o.status !== 'cancelled');
  const monthRevenue = activeMonth.reduce((s, o) => s + (o.total || 0), 0);
  const prevRevenue = prevMonthOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);
  const revenueDiff = prevRevenue > 0 ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100) : null;

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, processing: 0, processed: 0, cancelled: 0 };
    monthOrders.forEach((o) => { m[o.status] = (m[o.status] || 0) + 1; });
    return m;
  }, [monthOrders]);

  const productSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; amount: number; category: string }> = {};
    activeMonth.forEach((o) => {
      (o.items || []).forEach((i: any) => {
        if (!map[i.productId]) {
          const p = products.find((x) => x.id === i.productId);
          map[i.productId] = { name: i.name, qty: 0, amount: 0, category: p?.category || '' };
        }
        map[i.productId].qty += i.quantity || 0;
        map[i.productId].amount += (i.price || 0) * (i.quantity || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [activeMonth, products]);

  const categorySales = useMemo(() => {
    const map: Record<string, { qty: number; amount: number }> = {};
    productSales.forEach((p) => {
      const cat = p.category || '其他';
      if (!map[cat]) map[cat] = { qty: 0, amount: 0 };
      map[cat].qty += p.qty;
      map[cat].amount += p.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [productSales]);

  const dailySales = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: 0,
      count: 0,
    }));
    activeMonth.forEach((o) => {
      const d = new Date(o.createdAt).getDate();
      if (days[d - 1]) {
        days[d - 1].amount += o.total || 0;
        days[d - 1].count += 1;
      }
    });
    return days;
  }, [activeMonth, year, month]);

  const maxDaily = Math.max(...dailySales.map((d) => d.amount), 1);
  const years = useMemo(() => {
    const set = new Set(orders.map((o) => new Date(o.createdAt).getFullYear()));
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [orders]);

  const allRevenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const pending = orders.filter((o) => o.status === 'pending').length;
  const lowStock = products.filter((p) => p.stock <= 5).length;

  const overview = [
    { label: '當月營收', value: `$${monthRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-700 bg-emerald-50' },
    { label: '當月訂單', value: monthOrders.length, icon: ShoppingBag, color: 'text-amber-700 bg-amber-50' },
    { label: '待處理（全部）', value: pending, icon: Package, color: 'text-blue-700 bg-blue-50' },
    { label: '低庫存商品', value: lowStock, icon: AlertTriangle, color: 'text-red-700 bg-red-50' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] mb-1">總覽儀表板</h1>
          <p className="text-sm text-[#7a6555]">當月銷售狀況與營運一覽</p>
        </div>
        <div className="flex items-center gap-2 surface-warm rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-[var(--color-copper)]" />
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent text-sm font-bold outline-none">
            {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-transparent text-sm font-bold outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m} 月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <Link to="/admin/orders" className="surface-warm rounded-xl px-3 py-3 hover:border-[var(--color-copper)]/40 transition-colors">
          <p className="text-[10px] font-bold text-[#9a8674]">待處理訂單</p>
          <p className="text-lg font-black text-[var(--color-ink)]">{pending} <span className="text-xs font-bold text-[var(--color-copper)]">去處理 →</span></p>
        </Link>
        <Link to="/admin/products" className="surface-warm rounded-xl px-3 py-3 hover:border-[var(--color-copper)]/40 transition-colors">
          <p className="text-[10px] font-bold text-[#9a8674]">商品管理</p>
          <p className="text-lg font-black text-[var(--color-ink)]">{products.length} <span className="text-xs font-bold text-[var(--color-copper)]">去編輯 →</span></p>
        </Link>
        <Link to="/admin/site" className="surface-warm rounded-xl px-3 py-3 hover:border-[var(--color-copper)]/40 transition-colors">
          <p className="text-[10px] font-bold text-[#9a8674]">前台管理</p>
          <p className="text-sm font-black text-[var(--color-ink)] mt-1">輪播／結帳設定 →</p>
        </Link>
        <Link to="/admin/members" className="surface-warm rounded-xl px-3 py-3 hover:border-[var(--color-copper)]/40 transition-colors">
          <p className="text-[10px] font-bold text-[#9a8674]">會員</p>
          <p className="text-lg font-black text-[var(--color-ink)]">{members.length} <span className="text-xs font-bold text-[var(--color-copper)]">查看 →</span></p>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {overview.map((s) => (
          <div key={s.label} className="surface-warm rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#9a8674] font-bold">{s.label}</p>
            <p className="text-2xl font-black text-[var(--color-ink)] mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 當月對比 */}
      <div className="surface-warm rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display font-bold text-[var(--color-ink)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--color-copper)]" />
            {year} 年 {month} 月銷售概況
          </h3>
          <div className="text-sm text-[#7a6555]">
            上月營收 ${prevRevenue.toLocaleString()}
            {revenueDiff !== null && (
              <span className={`ml-2 font-bold ${revenueDiff >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {revenueDiff >= 0 ? '▲' : '▼'} {Math.abs(revenueDiff)}%
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <div key={k} className="bg-[#faf6f1] rounded-xl p-3 text-center">
              <p className="text-xs text-[#9a8674] font-bold">{label}</p>
              <p className="text-xl font-black text-[var(--color-ink)] mt-1">{statusCounts[k] || 0}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#9a8674] mt-3">
          有效訂單 {activeMonth.length} 筆 · 有效營收 ${monthRevenue.toLocaleString()} · 歷史總營收 ${allRevenue.toLocaleString()} · 會員 {members.length} 位
        </p>
      </div>

      {/* 每日營收長條 */}
      <div className="surface-warm rounded-2xl p-5 mb-6">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--color-copper)]" />每日營收
        </h3>
        <div className="flex items-end gap-0.5 md:gap-1 h-36 overflow-x-auto pb-1">
          {dailySales.map((d) => (
            <div key={d.day} className="flex-1 min-w-[8px] flex flex-col items-center justify-end h-full group relative">
              <div
                className="w-full max-w-[18px] rounded-t-sm bg-[linear-gradient(180deg,#d4894a,#b56a3a)] opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${Math.max(d.amount > 0 ? 8 : 2, (d.amount / maxDaily) * 100)}%` }}
                title={`${month}/${d.day}：$${d.amount}（${d.count} 筆）`}
              />
              {(d.day === 1 || d.day % 5 === 0 || d.day === dailySales.length) && (
                <span className="text-[9px] text-[#9a8674] mt-1">{d.day}</span>
              )}
            </div>
          ))}
        </div>
        {monthRevenue === 0 && (
          <p className="text-center text-sm text-[#9a8674] py-4">本月尚無有效銷售</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* 熱銷商品 */}
        <div className="surface-warm rounded-2xl p-5">
          <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">當月熱銷商品</h3>
          {productSales.length === 0 ? (
            <p className="text-sm text-[#9a8674] text-center py-8">本月尚無銷售資料</p>
          ) : (
            <div className="space-y-2">
              {productSales.slice(0, 8).map((p, i) => (
                <div key={p.name + i} className="flex items-center gap-3 py-2 border-b border-[#f0e6da] last:border-0">
                  <span className="w-6 h-6 rounded-lg bg-[#f3ebe1] text-[var(--color-copper)] text-xs font-black flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--color-ink)] truncate">{p.name}</p>
                    <p className="text-[10px] text-[#9a8674]">{p.category || '未分類'} · 售出 {p.qty} 份</p>
                  </div>
                  <p className="font-black text-[var(--color-copper)] text-sm">${p.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分類營收 */}
        <div className="surface-warm rounded-2xl p-5">
          <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">當月分類營收</h3>
          {categorySales.length === 0 ? (
            <p className="text-sm text-[#9a8674] text-center py-8">本月尚無分類資料</p>
          ) : (
            <div className="space-y-4">
              {categorySales.map(([cat, data]) => {
                const pct = monthRevenue > 0 ? Math.round((data.amount / monthRevenue) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold text-[var(--color-ink)]">{cat}</span>
                      <span className="text-[#7a6555]">${data.amount.toLocaleString()} · {data.qty} 份 · {pct}%</span>
                    </div>
                    <div className="h-2 bg-[#f0e6da] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-copper)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="surface-warm rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-[var(--color-ink)]">最新訂單</h3>
            <Link to="/admin/orders" className="text-xs text-[var(--color-copper)] font-bold">查看全部 →</Link>
          </div>
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex justify-between items-center py-2.5 border-b border-[#f0e6da] last:border-0 text-sm">
              <div>
                <p className="font-bold text-[var(--color-ink)]">{o.customerName}</p>
                <p className="text-xs text-[#9a8674]">{format(new Date(o.createdAt), 'MM/dd HH:mm')} · {STATUS_LABEL[o.status] || o.status}</p>
              </div>
              <p className={`font-bold ${o.status === 'cancelled' ? 'text-[#9a8674] line-through' : 'text-emerald-700'}`}>${o.total}</p>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-[#9a8674] text-center py-6">尚無訂單</p>}
        </div>

        <div className="surface-warm rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-[var(--color-ink)]">最新會員</h3>
            <Link to="/admin/members" className="text-xs text-[var(--color-copper)] font-bold">查看全部 →</Link>
          </div>
          {members.slice(0, 5).map((m) => (
            <div key={m.id} className="flex justify-between items-center py-2.5 border-b border-[#f0e6da] last:border-0 text-sm">
              <div>
                <p className="font-bold text-[var(--color-ink)]">{m.name || '（未填寫）'}</p>
                <p className="text-xs text-[#9a8674]">{m.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${m.isProfileComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {m.isProfileComplete ? '資料完整' : '待填寫'}
              </span>
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-[#9a8674] text-center py-6">尚無會員</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#7a6555]">
            <Users className="w-3.5 h-3.5" />共 {members.length} 位會員
          </div>
        </div>
      </div>
    </div>
  );
}
