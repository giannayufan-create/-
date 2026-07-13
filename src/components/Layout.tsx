import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { initAuth, logout } from '../lib/firebase';
import { ensureUserProfile, buildFallbackProfile, getCachedUserProfile } from '../lib/users';
import { useStore } from '../lib/store';
import AuthModal from './AuthModal';
import ProfileSetup from './ProfileSetup';
import AuthLoadingOverlay from './AuthLoadingOverlay';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, Store } from 'lucide-react';
import { useState } from 'react';
import SiteFooter from './SiteFooter';
import BackgroundMusic from './BackgroundMusic';
import { useSiteSettings } from '../lib/useSettings';
import { ensureSettingsLoaded, loadSettings } from '../lib/settingsCache';

interface LayoutProps { adminMode?: boolean }

export default function Layout({ adminMode }: LayoutProps) {
  const { user, userRole, setUser, setAuthLoading, setSigningIn, setProfileReady, cart, cartPulse, clearCartPulse, setAuthModalOpen, setProfileModalOpen } = useStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { settings, texts } = useSiteSettings();
  const scale = (settings.textScale || 110) / 100;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    ensureSettingsLoaded();
  }, []);

  useEffect(() => {
    if (!cartPulse) return;
    const t = setTimeout(() => clearCartPulse(), 1200);
    return () => clearTimeout(t);
  }, [cartPulse, clearCartPulse]);

  useEffect(() => {
    const unsub = initAuth(async (authUser, token) => {
      setProfileReady(false);
      try {
        await loadSettings();
        const profile = await ensureUserProfile(authUser);
        setUser(authUser, profile.role, token, profile);
      } catch (err) {
        console.warn('會員資料同步失敗，使用快取資料:', err);
        const cached = getCachedUserProfile(authUser.uid);
        if (cached) {
          setUser(authUser, cached.role, token, cached);
        } else {
          const fallback = buildFallbackProfile(authUser);
          setUser(authUser, fallback.role, token, fallback);
        }
      } finally {
        setProfileReady(true);
      }
    }, () => {
      setUser(null, null, null, null);
      setAuthLoading(false);
      setSigningIn(false);
      setProfileReady(false);
    });
    return () => unsub();
  }, [setUser, setAuthLoading, setSigningIn, setProfileReady]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const shell = (
    <>
      <AuthLoadingOverlay />
      <AuthModal />
      <ProfileSetup />
      <Outlet />
    </>
  );

  if (adminMode) {
    return <div className="min-h-screen bg-stone-50 flex flex-col font-sans">{shell}</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans" style={{ fontSize: `${scale}rem` }}>
      <AuthLoadingOverlay />
      <AuthModal />
      <ProfileSetup />

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl flex items-center justify-center text-lg">🍲</div>
            <div>
              <p className="font-black text-stone-900 text-sm leading-tight">{settings.storeName}</p>
              <p className="text-[10px] text-amber-600 font-bold">{texts.headerSubtitle}</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-bold text-stone-600 hover:text-amber-600 transition-colors">{texts.navMenu}</Link>
            {user && userRole !== 'admin' && <Link to="/orders" className="text-sm font-bold text-stone-600 hover:text-amber-600 transition-colors">{texts.navOrders}</Link>}
            {user && userRole === 'admin' && <Link to="/admin" className="text-sm font-bold text-stone-600 hover:text-amber-600 transition-colors">{texts.navAdmin}</Link>}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/cart" className={`relative p-2 rounded-lg transition-colors ${cartPulse ? 'text-amber-600 bg-amber-50' : 'text-stone-500 hover:text-amber-600'}`}>
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] transition-transform ${cartPulse ? 'scale-110 ring-2 ring-amber-300' : ''}`}>
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors">
                  <User className="w-4 h-4 text-stone-600" />
                  <span className="text-xs font-bold text-stone-700 hidden sm:inline max-w-[80px] truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-1 z-50">
                    <button onClick={() => { setProfileModalOpen(true); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50">修改資料</button>
                    {userRole === 'admin' ? (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-stone-50 flex items-center gap-2"><LayoutDashboard className="w-4 h-4" />管理後台</Link>
                    ) : (
                      <Link to="/orders" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-stone-50 flex items-center gap-2"><Package className="w-4 h-4" />我的訂單</Link>
                    )}
                    <hr className="my-1 border-stone-100" />
                    <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut className="w-4 h-4" />登出</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                {texts.navLogin}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 md:pb-8 flex flex-col">
        <Outlet />
      </main>

      <SiteFooter />

      {!adminMode && <BackgroundMusic />}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-40">
        {[
          { to: '/', icon: Store, label: texts.navMenu },
          { to: '/cart', icon: ShoppingCart, label: texts.navCart, badge: totalItems },
          ...(user ? [{ to: userRole === 'admin' ? '/admin' : '/orders', icon: userRole === 'admin' ? LayoutDashboard : Package, label: userRole === 'admin' ? texts.navAdmin : texts.navOrders }] : []),
          { action: () => user ? setMenuOpen(true) : setAuthModalOpen(true), icon: User, label: user ? texts.navMember : texts.navLogin },
        ].map((item, i) => (
          item.to ? (
            <Link key={i} to={item.to} className={`flex-1 flex flex-col items-center justify-center py-2 text-stone-500 hover:text-amber-600 relative ${item.to === '/cart' && cartPulse ? 'text-amber-600' : ''}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
              {'badge' in item && item.badge! > 0 && (
                <span className="absolute top-1 right-1/4 bg-amber-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.badge}</span>
              )}
            </Link>
          ) : (
            <button key={i} onClick={item.action} className="flex-1 flex flex-col items-center justify-center py-2 text-stone-500 hover:text-amber-600">
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
            </button>
          )
        ))}
      </nav>
    </div>
  );
}
