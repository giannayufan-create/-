import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

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

  const revenue = orders.filter((o) => o.status === 'processed').reduce((s, o) => s + (o.total || 0), 0);
  const pending = orders.filter((o) => o.status === 'pending').length;
  const lowStock = products.filter((p) => p.stock <= 5).length;
  const incomplete = members.filter((m) => !m.isProfileComplete).length;

  const stats = [
    { label: '總營業額', value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: '待處理訂單', value: pending, icon: ShoppingBag, color: 'text-amber-600 bg-amber-50' },
    { label: '註冊會員', value: members.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: '低庫存商品', value: lowStock, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-stone-900 mb-1">總覽儀表板</h1>
      <p className="text-sm text-stone-500 mb-6">一眼掌握網站營運狀況</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-stone-400 font-bold">{s.label}</p>
            <p className="text-2xl font-black text-stone-900 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-stone-800">最新訂單</h3>
            <Link to="/admin/orders" className="text-xs text-amber-600 font-bold">查看全部 →</Link>
          </div>
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex justify-between items-center py-2.5 border-b border-stone-50 last:border-0 text-sm">
              <div>
                <p className="font-bold text-stone-700">{o.customerName}</p>
                <p className="text-xs text-stone-400">{format(new Date(o.createdAt), 'MM/dd HH:mm')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-700">${o.total}</p>
                <p className="text-[10px] text-stone-400">{o.status}</p>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-stone-400 text-center py-6">尚無訂單</p>}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-stone-800">最新會員</h3>
            <Link to="/admin/members" className="text-xs text-amber-600 font-bold">查看全部 →</Link>
          </div>
          {members.slice(0, 5).map((m) => (
            <div key={m.id} className="flex justify-between items-center py-2.5 border-b border-stone-50 last:border-0 text-sm">
              <div>
                <p className="font-bold text-stone-700">{m.name || '（未填寫）'}</p>
                <p className="text-xs text-stone-400">{m.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.isProfileComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {m.isProfileComplete ? '資料完整' : '待填寫'}
              </span>
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-stone-400 text-center py-6">尚無會員，有人註冊後會自動出現</p>}
          {incomplete > 0 && (
            <p className="text-xs text-amber-600 font-bold mt-3">⚠️ {incomplete} 位會員尚未完成基本資料</p>
          )}
        </div>
      </div>
    </div>
  );
}
