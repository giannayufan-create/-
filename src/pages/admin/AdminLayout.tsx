import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings,
  ArrowLeft, LogOut, Store, Plus, BarChart3,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import NotificationBell from '../../components/NotificationBell';
import { useStore } from '../../lib/store';
import { logout } from '../../lib/firebase';

const NAV = [
  { to: '/admin', label: '總覽', full: '總覽儀表板', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: '訂單', full: '訂單管理', icon: ShoppingBag },
  { to: '/admin/products', label: '商品', full: '商品管理', icon: Package },
  { to: '/admin/members', label: '會員', full: '會員管理', icon: Users },
  { to: '/admin/site', label: '店面', full: '店面設定', icon: Store },
  { to: '/admin/reports', label: '報表', full: '營運報表', icon: BarChart3 },
  { to: '/admin/system', label: '系統', full: '系統整合', icon: Settings },
];

export default function AdminLayout() {
  const { userRole } = useStore();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (userRole !== 'admin') return;
    return onSnapshot(collection(db, 'orders'), (s) => {
      setPendingCount(s.docs.filter((d) => d.data().status === 'pending').length);
    });
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="surface-warm rounded-2xl p-10 text-center max-w-sm">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] mb-2">權限不足</h2>
          <p className="text-sm text-[#7a6555] mb-4">此頁面僅限管理員使用</p>
          <button type="button" onClick={() => navigate('/')} className="btn-copper px-6 py-2 rounded-xl font-bold text-sm">返回首頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      <aside className="hidden lg:flex w-60 bg-[linear-gradient(180deg,#2a211c_0%,#1c1410_100%)] text-[#d9c8b6] flex-col shrink-0 overflow-visible">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#9a8674] font-medium tracking-[0.2em]">管理後台</p>
            <h2 className="font-display font-bold text-lg mt-1 text-white tracking-wide">滷味小哥</h2>
          </div>
          <NotificationBell dark />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, full, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-[var(--color-copper)] text-white' : 'text-[#cbb9a5] hover:bg-white/5 hover:text-white'
                }`
              }>
              <Icon className="w-4 h-4" />
              <span className="flex-1">{full}</span>
              {to === '/admin/orders' && pendingCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-[#c45c3a] text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-1.5 px-1 mb-1">
            <button type="button" onClick={() => navigate('/admin/orders')} className="text-[10px] font-bold bg-white/10 hover:bg-white/15 rounded-lg py-2 text-center">
              待處理 {pendingCount}
            </button>
            <button type="button" onClick={() => navigate('/admin/products')} className="text-[10px] font-bold bg-white/10 hover:bg-white/15 rounded-lg py-2 text-center flex items-center justify-center gap-0.5">
              <Plus className="w-3 h-3" />商品
            </button>
          </div>
          <button type="button" onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#cbb9a5] hover:bg-white/5 hover:text-white">
            <ArrowLeft className="w-4 h-4" />回到前台
          </button>
          <button type="button" onClick={() => logout().then(() => navigate('/'))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#e8a090] hover:bg-white/5">
            <LogOut className="w-4 h-4" />登出
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-[#faf6f1]/95 backdrop-blur-md border-b border-[#e8d9c8]">
          <div className="flex items-center justify-between p-3">
            <p className="font-display font-bold text-[var(--color-ink)] text-sm">管理後台</p>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/admin/orders')}
                  className="text-[10px] font-bold bg-[#c45c3a] text-white px-2.5 py-1.5 rounded-lg"
                >
                  待處理 {pendingCount}
                </button>
              )}
              <NotificationBell dark={false} />
            </div>
          </div>
          <div className="flex overflow-x-auto gap-1 px-3 pb-3 touch-scroll scrollbar-hide">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-10 ${
                    isActive ? 'bg-[var(--color-copper)] text-white' : 'bg-white/80 text-[#6b5648]'
                  }`
                }>
                <Icon className="w-3.5 h-3.5" />
                {label}
                {to === '/admin/orders' && pendingCount > 0 && (
                  <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded bg-white/25 text-[9px] flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto text-base touch-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
