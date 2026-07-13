import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings,
  ArrowLeft, LogOut,
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import { useStore } from '../../lib/store';
import { logout } from '../../lib/firebase';

const NAV = [
  { to: '/admin', label: '總覽儀表板', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: '訂單管理', icon: ShoppingBag },
  { to: '/admin/products', label: '商品管理', icon: Package },
  { to: '/admin/members', label: '會員管理', icon: Users },
  { to: '/admin/settings', label: '前台與設定', icon: Settings },
];

export default function AdminLayout() {
  const { userRole } = useStore();
  const navigate = useNavigate();

  if (userRole !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-black text-stone-800 mb-2">權限不足</h2>
          <p className="text-sm text-stone-500 mb-4">此頁面僅限管理員使用</p>
          <button onClick={() => navigate('/')} className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold text-sm">返回首頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      <aside className="hidden lg:flex w-60 bg-stone-900 text-white flex-col shrink-0 overflow-visible">
        <div className="p-5 border-b border-stone-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 font-medium">管理後台</p>
            <h2 className="font-black text-lg mt-0.5">滷味小哥</h2>
          </div>
          <NotificationBell dark />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-amber-600 text-white' : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`
              }>
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-700 space-y-1">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-stone-300 hover:bg-stone-800">
            <ArrowLeft className="w-4 h-4" />回到前台
          </button>
          <button onClick={() => logout().then(() => navigate('/'))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-stone-800">
            <LogOut className="w-4 h-4" />登出
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-stone-50">
        <div className="lg:hidden flex items-center justify-between p-3 bg-white border-b border-stone-200">
          <p className="font-black text-stone-800 text-sm">管理後台</p>
          <NotificationBell dark={false} />
        </div>
        <div className="lg:hidden flex overflow-x-auto gap-1 px-3 pb-3 bg-white border-b border-stone-200">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold ${isActive ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`
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
