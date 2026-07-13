import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, MessageCircle, ArrowUp, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useSiteSettings } from '../lib/useSettings';

export default function FloatingDock() {
  const navigate = useNavigate();
  const { cart, setSearchOpen, isSearchOpen, menuSearch, setMenuSearch, setContactOpen } = useStore();
  const { settings } = useSiteSettings();
  const [showTop, setShowTop] = useState(false);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const btn = 'w-10 h-10 rounded-xl bg-[var(--color-ink)]/92 text-[#f0d2b0] flex items-center justify-center shadow-[0_8px_24px_-10px_rgba(28,20,16,0.55)] hover:bg-[var(--color-copper)] hover:text-white transition-colors backdrop-blur-sm';

  return (
    <>
      <div className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-[90] flex flex-col gap-2">
        <Link to="/cart" className={`${btn} relative`} title="購物車" aria-label="購物車">
          <ShoppingCart className="w-4 h-4" />
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-md bg-[#c45c3a] text-white text-[9px] font-bold flex items-center justify-center">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </Link>
        <button type="button" onClick={() => setSearchOpen(true)} className={btn} title="搜尋" aria-label="搜尋">
          <Search className="w-4 h-4" />
        </button>
        {settings.lineUrl && (
          <a href={settings.lineUrl} target="_blank" rel="noreferrer" className={btn} title="LINE" aria-label="LINE">
            <MessageCircle className="w-4 h-4" />
          </a>
        )}
        <button type="button" onClick={() => setContactOpen(true)} className={`${btn} text-[10px] font-bold tracking-wider`} title="聯絡我們" aria-label="聯絡我們">
          聯
        </button>
        {showTop && (
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={btn} title="回到頂部" aria-label="回到頂部">
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[410] bg-[var(--color-ink)]/45 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-md bg-[#fffcf8] rounded-2xl border border-[#eadfce] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-bold text-[var(--color-ink)]">搜尋商品</p>
              <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-[#9a8674]"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-[#9a8674] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchOpen(false);
                    navigate('/');
                    setTimeout(() => document.getElementById('menu-search-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }
                }}
                placeholder="輸入商品名稱…"
                className="w-full pl-9 pr-3 py-3 bg-[#faf6f1] border border-[#e8d9c8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)]/30"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                navigate('/');
                setTimeout(() => document.getElementById('menu-search-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
              className="mt-3 w-full btn-ink py-2.5 rounded-xl text-sm font-bold"
            >
              搜尋菜單
            </button>
          </div>
        </div>
      )}
    </>
  );
}
