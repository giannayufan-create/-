import { Link } from 'react-router-dom';
import { LayoutDashboard, Eye } from 'lucide-react';

export default function AdminPreviewBar() {
  return (
    <div className="bg-[var(--color-ink)] text-[#f0d2b0] px-4 py-2.5 flex items-center justify-between gap-3 text-sm -mx-4 -mt-6 mb-6 md:mx-0 md:mt-0 md:mb-5 md:rounded-xl">
      <span className="flex items-center gap-2 font-medium">
        <Eye className="w-4 h-4 shrink-0 text-[var(--color-ember)]" />
        管理員預覽模式 — 這是客人看到的前台畫面
      </span>
      <Link to="/admin" className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold transition-colors text-white">
        <LayoutDashboard className="w-4 h-4" />
        返回後台
      </Link>
    </div>
  );
}
