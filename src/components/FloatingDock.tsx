import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, MessageCircle, ArrowUp, X, Phone } from 'lucide-react';
import { useStore } from '../lib/store';
import { useSiteSettings } from '../lib/useSettings';

function resolveLineUrl(lineUrl?: string, lineId?: string) {
  if (lineUrl?.trim()) return lineUrl.trim();
  const id = (lineId || '').trim().replace(/^@/, '');
  if (id) return `https://line.me/R/ti/p/@${id}`;
  return '';
}

export default function FloatingDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, setSearchOpen, isSearchOpen, menuSearch, setMenuSearch, setContactOpen } = useStore();
  const { settings } = useSiteSettings();
  const [showTop, setShowTop] = useState(false);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const lineHref = resolveLineUrl(settings.lineUrl, settings.lineId);
  // 購物車／訂單頁隱藏，避免與內容、頁尾重疊變形
  const hideDock = location.pathname === '/cart' || location.pathname.startsWith('/orders');

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 180);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (hideDock && !isSearchOpen) return null;

  const btn =
    'w-9 h-9 rounded-lg bg-[var(--color-ink)]/95 text-[#f0d2b0] flex items-center justify-center shadow-[0_6px_18px_-8px_rgba(28,20,16,0.55)] hover:bg-[var(--color-copper)] hover:text-white transition-colors border border-white/10';

  const dock = (
    <>
      {!hideDock && (
        <div className="fixed right-2.5 md:right-4 bottom-[5.5rem] md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-[90] flex flex-col gap-1.5 pointer-events-auto">
          <Link to="/cart" className={`${btn} relative`} title="購物車" aria-label="購物車">
            <ShoppingCart className="w-3.5 h-3.5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded bg-[#c45c3a] text-white text-[8px] font-bold flex items-center justify-center leading-none">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>
          <button type="button" onClick={() => setSearchOpen(true)} className={btn} title="搜尋" aria-label="搜尋">
            <Search className="w-3.5 h-3.5" />
          </button>
          {lineHref ? (
            <a href={lineHref} target="_blank" rel="noreferrer" className={`${btn} !bg-[#06C755] !text-white hover:!bg-[#05b34c]`} title="LINE" aria-label="LINE">
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button type="button" onClick={() => setContactOpen(true)} className={`${btn} !bg-[#06C755] !text-white`} title="LINE／聯絡" aria-label="LINE">
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setContactOpen(true)} className={btn} title="聯絡我們" aria-label="聯絡我們">
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`${btn} transition-opacity ${showTop ? 'opacity-100' : 'opacity-40'}`}
            title="回到頂部"
            aria-label="回到頂部"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

  if (typeof document === 'undefined') return null;
  return createPortal(dock, document.body);
}
