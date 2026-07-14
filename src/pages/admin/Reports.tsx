import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, isSameMonth, parseISO } from 'date-fns';
import { BarChart3, Calendar, Download, DollarSign, Package, TrendingUp } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  pending: '待處理',
  processing: '處理中',
  processed: '已完成',
  cancelled: '已取消',
};

export default function AdminReports() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'orders'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(docs);
    });
    const u2 = onSnapshot(collection(db, 'products'), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  const selectedDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);

  const monthOrders = useMemo(
    () =>
      orders.filter((o) => {
        try {
          return isSameMonth(parseISO(o.createdAt), selectedDate);
        } catch {
          return false;
        }
      }),
    [orders, selectedDate],
  );

  const activeMonth = monthOrders.filter((o) => o.status !== 'cancelled');
  const monthRevenue = activeMonth.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = activeMonth.length ? Math.round(monthRevenue / activeMonth.length) : 0;

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
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: 0, count: 0 }));
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

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    activeMonth.forEach((o) => {
      const key = o.paymentMethod || '未填';
      if (!map[key]) map[key] = { count: 0, amount: 0 };
      map[key].count += 1;
      map[key].amount += o.total || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [activeMonth]);

  const downloadCsv = () => {
    const headers = ['日期', '訂單編號', '客戶', '電話', '狀態', '付款', '配送日', '金額'];
    const rows = monthOrders.map((o) => [
      o.createdAt ? format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm') : '',
      o.id,
      o.customerName,
      o.customerPhone,
      STATUS_LABEL[o.status] || o.status,
      o.paymentMethod || '',
      `${o.deliveryDate || ''} ${o.deliveryTime || ''}`.trim(),
      o.total,
    ]);
    const productHeaders = ['商品', '分類', '數量', '營收'];
    const productRows = productSales.map((p) => [p.name, p.category, p.qty, p.amount]);
    const csv =
      `【訂單明細】\n${[headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}\n\n` +
      `【商品銷售】\n${[productHeaders, ...productRows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `營運報表_${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] mb-1">營運報表</h1>
          <p className="text-sm text-[#7a6555]">月營收、熱銷、付款方式與 CSV 匯出</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 surface-warm rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[var(--color-copper)]" />
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-transparent text-sm font-bold outline-none">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold outline-none">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!monthOrders.length}
            className="flex items-center gap-2 btn-copper px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            匯出 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: '當月營收', value: `$${monthRevenue.toLocaleString()}`, icon: DollarSign },
          { label: '有效訂單', value: activeMonth.length, icon: Package },
          { label: '客單價', value: `$${avgOrder.toLocaleString()}`, icon: TrendingUp },
          { label: '全部訂單', value: monthOrders.length, icon: BarChart3 },
        ].map((s) => (
          <div key={s.label} className="surface-warm rounded-2xl p-5">
            <s.icon className="w-5 h-5 text-[var(--color-copper)] mb-2" />
            <p className="text-xs text-[#9a8674] font-bold">{s.label}</p>
            <p className="text-2xl font-black text-[var(--color-ink)] mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-warm rounded-2xl p-5 mb-6">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--color-copper)]" />
          每日營收
        </h3>
        <div className="flex items-end gap-0.5 md:gap-1 h-36 overflow-x-auto pb-1">
          {dailySales.map((d) => (
            <div key={d.day} className="flex-1 min-w-[8px] flex flex-col items-center justify-end h-full">
              <div
                className="w-full max-w-[18px] rounded-t-sm bg-[linear-gradient(180deg,#d4894a,#b56a3a)] opacity-80"
                style={{ height: `${Math.max(d.amount > 0 ? 8 : 2, (d.amount / maxDaily) * 100)}%` }}
                title={`${month}/${d.day}：$${d.amount}（${d.count} 筆）`}
              />
              {(d.day === 1 || d.day % 5 === 0 || d.day === dailySales.length) && (
                <span className="text-[9px] text-[#9a8674] mt-1">{d.day}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="surface-warm rounded-2xl p-5">
          <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">熱銷商品</h3>
          {productSales.length === 0 ? (
            <p className="text-sm text-[#9a8674] text-center py-8">本月尚無銷售資料</p>
          ) : (
            <div className="space-y-2">
              {productSales.slice(0, 12).map((p, i) => (
                <div key={p.name + i} className="flex items-center gap-3 py-2 border-b border-[#f0e6da] last:border-0">
                  <span className="w-6 h-6 rounded-lg bg-[#f3ebe1] text-[var(--color-copper)] text-xs font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--color-ink)] truncate">{p.name}</p>
                    <p className="text-[10px] text-[#9a8674]">
                      {p.category || '未分類'} · 售出 {p.qty} 份
                    </p>
                  </div>
                  <p className="font-black text-[var(--color-copper)] text-sm">${p.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="surface-warm rounded-2xl p-5">
            <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">分類營收</h3>
            {categorySales.length === 0 ? (
              <p className="text-sm text-[#9a8674] text-center py-6">尚無資料</p>
            ) : (
              <div className="space-y-3">
                {categorySales.map(([cat, data]) => {
                  const pct = monthRevenue > 0 ? Math.round((data.amount / monthRevenue) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-[var(--color-ink)]">{cat}</span>
                        <span className="text-[#7a6555]">
                          ${data.amount.toLocaleString()} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#f0e6da] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-copper)] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="surface-warm rounded-2xl p-5">
            <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">付款方式占比</h3>
            {paymentBreakdown.length === 0 ? (
              <p className="text-sm text-[#9a8674] text-center py-6">尚無資料</p>
            ) : (
              <div className="space-y-2">
                {paymentBreakdown.map(([method, data]) => (
                  <div key={method} className="flex justify-between text-sm py-2 border-b border-[#f0e6da] last:border-0">
                    <span className="font-bold text-[var(--color-ink)]">
                      {method} · {data.count} 筆
                    </span>
                    <span className="font-black text-[var(--color-copper)]">${data.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
