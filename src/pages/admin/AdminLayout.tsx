import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings,
  ArrowLeft, LogOut, PanelsTopLeft,
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import { useStore } from '../../lib/store';
import { logout } from '../../lib/firebase';

const NAV = [
  { to: '/admin', label: '總覽儀表板', icon: LayoutDashboard, end: true },
  { to: '/admin/site', label: '前台管理', icon: PanelsTopLeft },
  { to: '/admin/orders', label: '訂單管理', icon: ShoppingBag },
  { to: '/admin/products', label: '商品管理', icon: Package },
  { to: '/admin/members', label: '會員管理', icon: Users },
  { to: '/admin/settings', label: '進階設定', icon: Settings },
];

export default function AdminLayout() {
  const { userRole } = useStore();
  const navigate = useNavigate();

  if (userRole !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="surface-warm rounded-2xl p-10 text-center max-w-sm">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] mb-2">權限不足</h2>
          <p className="text-sm text-[#7a6555] mb-4">此頁面僅限管理員使用</p>
          <button onClick={() => navigate('/')} className="btn-copper px-6 py-2 rounded-xl font-bold text-sm">返回首頁</button>
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
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-[var(--color-copper)] text-white' : 'text-[#cbb9a5] hover:bg-white/5 hover:text-white'
                }`
              }>
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#cbb9a5] hover:bg-white/5 hover:text-white">
            <ArrowLeft className="w-4 h-4" />回到前台
          </button>
          <button onClick={() => logout().then(() => navigate('/'))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#e8a090] hover:bg-white/5">
            <LogOut className="w-4 h-4" />登出
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center justify-between p-3 bg-[#faf6f1]/90 border-b border-[#e8d9c8]">
          <p className="font-display font-bold text-[var(--color-ink)] text-sm">管理後台</p>
          <NotificationBell dark={false} />
        </div>
        <div className="lg:hidden flex overflow-x-auto gap-1 px-3 pb-3 bg-[#faf6f1]/90 border-b border-[#e8d9c8]">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold ${isActive ? 'bg-[var(--color-copper)] text-white' : 'bg-white/80 text-[#6b5648]'}`
              }>{label}</NavLink>
          ))}
        </div>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto text-base">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
