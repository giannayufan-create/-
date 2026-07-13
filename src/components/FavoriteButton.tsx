import { Heart } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { useStore } from '../lib/store';
import { toggleFavorite, cacheUserProfile } from '../lib/users';

type Props = {
  productId: string;
  className?: string;
  size?: 'sm' | 'md';
};

export default function FavoriteButton({ productId, className = '', size = 'sm' }: Props) {
  const { user, userData, setUser, accessToken, userRole, setAuthModalOpen } = useStore();
  const [busy, setBusy] = useState(false);
  const liked = Boolean(userData?.favorites?.includes(productId));
  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  const onToggle = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !userData) {
      setAuthModalOpen(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    const prev = userData.favorites || [];
    const optimistic = liked ? prev.filter((id) => id !== productId) : [...prev, productId];
    const nextProfile = { ...userData, favorites: optimistic };
    setUser(user, userRole, accessToken, nextProfile);
    cacheUserProfile(nextProfile);
    try {
      const favorites = await toggleFavorite(user.uid, productId, prev);
      const synced = { ...userData, favorites };
      setUser(user, userRole, accessToken, synced);
      cacheUserProfile(synced);
    } catch {
      setUser(user, userRole, accessToken, userData);
      cacheUserProfile(userData);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      title={liked ? '取消喜歡' : '加入喜歡'}
      aria-label={liked ? '取消喜歡' : '加入喜歡'}
      className={`rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
        liked
          ? 'bg-[#c45c3a] text-white'
          : 'bg-white/90 text-[#c45c3a] border border-[#f0d5ce] hover:bg-[#fdf2ef]'
      } ${className}`}
    >
      <Heart className={`${iconClass} ${liked ? 'fill-current' : ''}`} />
    </button>
  );
}
