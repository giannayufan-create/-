import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { initAuth, logout } from '../lib/firebase';
import { ensureUserProfile, buildFallbackProfile, getCachedUserProfile } from '../lib/users';
import { useStore } from '../lib/store';
import AuthModal from './AuthModal';
import ProfileSetup from './ProfileSetup';
import AuthLoadingOverlay from './AuthLoadingOverlay';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, Store } from 'lucide-react';
import SiteFooter from './SiteFooter';
import BackgroundMusic from './BackgroundMusic';
import ContactModal from './ContactModal';
import FloatingDock from './FloatingDock';
import { useSiteSettings } from '../lib/useSettings';
import { ensureSettingsLoaded, loadSettings } from '../lib/settingsCache';

interface LayoutProps { adminMode?: boolean }

export default function Layout({ adminMode }: LayoutProps) {
  const { user, userRole, setUser, setAuthLoading, setSigningIn, setProfileReady, cart, cartPulse, clearCartPulse, setAuthModalOpen, setProfileModalOpen, setContactOpen } = useStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 16 });
  const btnRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!menuOpen) return;
    const update = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) });
      } else {
        // 手機底部選單開啟時，顯示在畫面下方中央
        setMenuPos({ top: Math.max(80, window.innerHeight - 280), right: 12 });
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const openProfile = () => {
    setMenuOpen(false);
    setProfileModalOpen(true);
  };

  const memberMenu = menuOpen && user ? createPortal(
    <>
      <div className="fixed inset-0 z-[300]" onClick={() => setMenuOpen(false)} aria-hidden />
      <div
        className="fixed z-[301] w-52 bg-[#fffcf8] border border-[#eadfce] rounded-2xl shadow-[0_20px_50px_-18px_rgba(28,20,16,0.45)] py-1.5 overflow-hidden"
        style={{ top: menuPos.top, right: menuPos.right }}
      >
        <p className="px-4 py-2 text-[10px] font-bold text-[#9a8674] tracking-wide border-b border-[#f0e6da]">
          {user.displayName || user.email?.split('@')[0] || '會員選單'}
        </p>
        <button type="button" onClick={openProfile} className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[#f6efe6]">
          修改資料
        </button>
        {userRole === 'admin' ? (
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-[#f6efe6]">
            <LayoutDashboard className="w-4 h-4" />管理後台
          </Link>
        ) : (
          <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-[#f6efe6]">
            <Package className="w-4 h-4" />我的訂單
          </Link>
        )}
        <hr className="border-[#eadfce]" />
        <button type="button" onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-medium text-[#b5452c] hover:bg-[#fdf2ef] flex items-center gap-2">
          <LogOut className="w-4 h-4" />登出
        </button>
      </div>
    </>,
    document.body,
  ) : null;

  const shell = (
    <>
      <AuthLoadingOverlay />
      <AuthModal />
      <ProfileSetup />
      <Outlet />
    </>
  );

  if (adminMode) {
    return <div className="min-h-screen admin-atmosphere flex flex-col font-sans">{shell}</div>;
  }

  return (
    <div className="min-h-screen site-atmosphere flex flex-col font-sans" style={{ fontSize: `${scale}rem` }}>
      <AuthLoadingOverlay />
      <AuthModal />
      <ProfileSetup />
      {memberMenu}

      <header className="sticky top-0 z-50 bg-[#faf6f1]/92 backdrop-blur-md border-b border-[#e8d9c8]/80">
        <div className="max-w-6xl mx-auto px-4 h-[4.25rem] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="brand-mark w-10 h-10 rounded-xl flex items-center justify-center text-white font-display text-sm font-bold tracking-wider">
              滷
            </div>
            <div>
              <p className="font-display font-bold text-[var(--color-ink)] text-base leading-tight tracking-wide group-hover:text-[var(--color-copper)] transition-colors">
                {settings.storeName}
              </p>
              <p className="text-[10px] text-[var(--color-copper)] font-medium tracking-[0.2em] mt-0.5">
                {texts.headerSubtitle}
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-[#5c4a3d] hover:text-[var(--color-copper)] transition-colors">{texts.navMenu}</Link>
            <button type="button" onClick={() => setContactOpen(true)} className="text-sm font-medium text-[#5c4a3d] hover:text-[var(--color-copper)] transition-colors">
              聯絡我們
            </button>
            {user && userRole !== 'admin' && <Link to="/orders" className="text-sm font-medium text-[#5c4a3d] hover:text-[var(--color-copper)] transition-colors">{texts.navOrders}</Link>}
            {user && userRole === 'admin' && <Link to="/admin" className="text-sm font-medium text-[#5c4a3d] hover:text-[var(--color-copper)] transition-colors">{texts.navAdmin}</Link>}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link to="/cart" className={`relative p-2.5 rounded-xl transition-colors ${cartPulse ? 'text-[var(--color-copper)] bg-[#f3e2d0]' : 'text-[#6b5648] hover:text-[var(--color-copper)] hover:bg-[#f3e8dc]'}`}>
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 bg-[var(--color-copper)] text-white text-[9px] font-bold rounded-md flex items-center justify-center min-w-[18px] min-h-[18px] transition-transform ${cartPulse ? 'scale-110' : ''}`}>
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <button
                ref={btnRef}
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 bg-[#f0e6da] hover:bg-[#e8d9c8] px-3 py-2 rounded-xl transition-colors"
              >
                <User className="w-4 h-4 text-[#6b5648]" />
                <span className="text-xs font-bold text-[#3d2e24] hidden sm:inline max-w-[80px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </button>
            ) : (
              <button type="button" onClick={() => setAuthModalOpen(true)} className="btn-copper text-sm font-bold px-4 py-2 rounded-xl">
                {texts.navLogin}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-28 md:pb-10 flex flex-col">
        <Outlet />
      </main>

      <SiteFooter />
      <ContactModal />
      <FloatingDock />
      <BackgroundMusic />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#faf6f1]/95 backdrop-blur-md border-t border-[#e8d9c8] flex z-40 safe-bottom">
        {[
          { to: '/', icon: Store, label: texts.navMenu },
          { to: '/cart', icon: ShoppingCart, label: texts.navCart, badge: totalItems },
          ...(user ? [{ to: userRole === 'admin' ? '/admin' : '/orders', icon: userRole === 'admin' ? LayoutDashboard : Package, label: userRole === 'admin' ? texts.navAdmin : texts.navOrders }] : []),
          { action: () => (user ? setMenuOpen((v) => !v) : setAuthModalOpen(true)), icon: User, label: user ? texts.navMember : texts.navLogin },
        ].map((item, i) => (
          item.to ? (
            <Link key={i} to={item.to} className={`flex-1 flex flex-col items-center justify-center py-2.5 text-[#6b5648] hover:text-[var(--color-copper)] relative ${item.to === '/cart' && cartPulse ? 'text-[var(--color-copper)]' : ''}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
              {'badge' in item && item.badge! > 0 && (
                <span className="absolute top-1 right-1/4 bg-[var(--color-copper)] text-white text-[8px] font-bold w-4 h-4 rounded-md flex items-center justify-center">{item.badge}</span>
              )}
            </Link>
          ) : (
            <button key={i} type="button" onClick={item.action} className="flex-1 flex flex-col items-center justify-center py-2.5 text-[#6b5648] hover:text-[var(--color-copper)]">
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
            </button>
          )
        ))}
      </nav>
    </div>
  );
}
