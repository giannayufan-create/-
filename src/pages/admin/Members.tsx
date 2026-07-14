import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { Search, Download, X, Minus, Plus } from 'lucide-react';
import { MEMBER_LEVELS, TAIWAN_REGIONS } from '../../types';
import { extractRegion } from '../../lib/constants';

const PROVIDER_LABEL: Record<string, string> = {
  'google.com': 'Google',
  'facebook.com': 'Facebook',
  'yahoo.com': 'Yahoo',
  password: 'Email 註冊',
};

const LEVEL_COLOR: Record<string, string> = {
  '一般': 'bg-stone-100 text-stone-700',
  '銀卡': 'bg-slate-200 text-slate-800',
  '金卡': 'bg-yellow-100 text-yellow-800',
  'VIP': 'bg-purple-100 text-purple-800',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待處理',
  processing: '處理中',
  processed: '已完成',
  cancelled: '已取消',
};

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('全部');
  const [levelFilter, setLevelFilter] = useState('全部');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pointsDelta, setPointsDelta] = useState('10');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'users'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setMembers(docs);
    }, (err) => console.error('會員讀取失敗:', err));
    const u2 = onSnapshot(collection(db, 'orders'), (s) => {
      setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  const filtered = members.filter((m) => {
    const region = m.region || extractRegion(m.shippingAddress || '');
    if (regionFilter !== '全部' && region !== regionFilter) return false;
    if (levelFilter !== '全部' && (m.level || '一般') !== levelFilter) return false;
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.phone?.includes(q);
  });

  const selected = members.find((m) => m.id === selectedId) || null;
  const memberOrders = useMemo(
    () => orders
      .filter((o) => o.userId === selectedId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, selectedId],
  );
  const memberSpend = memberOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);

  const updateLevel = async (id: string, level: string) => {
    await updateDoc(doc(db, 'users', id), { level, updatedAt: new Date().toISOString() });
  };

  const adjustPoints = async (dir: 1 | -1) => {
    if (!selected) return;
    const delta = Math.abs(Number(pointsDelta) || 0) * dir;
    if (!delta) return;
    setSaving(true);
    try {
      const next = Math.max(0, (selected.points || 0) + delta);
      await updateDoc(doc(db, 'users', selected.id), { points: next, updatedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  const downloadCSV = () => {
    if (!filtered.length) return;
    const headers = ['項次', '姓名', 'Email', '電話', '地區', '等級', '點數', '送貨地址', '角色', '註冊方式', '註冊日期'];
    const rows = filtered.map((m, i) => [
      i + 1, m.name, m.email, m.phone,
      m.region || extractRegion(m.shippingAddress || ''),
      m.level || '一般', m.points ?? 0, m.shippingAddress,
      m.role, PROVIDER_LABEL[m.provider] || m.provider,
      m.createdAt ? format(new Date(m.createdAt), 'yyyy/MM/dd') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '會員名單.csv'; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">會員管理</h1>
          <p className="text-sm text-[#7a6555]">共 {members.length} 人 · 點會員可看詳情、調點數與訂單紀錄</p>
        </div>
        <button type="button" onClick={downloadCSV} className="flex items-center gap-2 surface-warm px-4 py-2 rounded-xl text-sm font-bold hover:border-[var(--color-copper)]/40">
          <Download className="w-4 h-4" />匯出 CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9a8674] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋姓名、Email、電話..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e8d9c8] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-copper)]/30 focus:outline-none" />
        </div>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
          className="bg-white border border-[#e8d9c8] rounded-xl px-4 py-2.5 text-sm font-bold">
          {TAIWAN_REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-white border border-[#e8d9c8] rounded-xl px-4 py-2.5 text-sm font-bold">
          <option>全部</option>
          {MEMBER_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      <div className="surface-warm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-[#9a8674] uppercase tracking-wider border-b border-[#f0e6da] bg-[#faf6f1]">
                <th className="text-left p-4 w-12">#</th>
                <th className="text-left p-4">會員</th>
                <th className="text-left p-4">聯絡方式</th>
                <th className="text-left p-4">地區</th>
                <th className="text-left p-4">等級</th>
                <th className="text-left p-4">點數</th>
                <th className="text-left p-4">註冊日期</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`border-b border-[#f0e6da] hover:bg-[#faf6f1]/80 cursor-pointer ${selectedId === m.id ? 'bg-amber-50/60' : ''}`}
                >
                  <td className="p-4 text-xs text-[#9a8674] font-mono">{i + 1}</td>
                  <td className="p-4">
                    <p className="font-bold text-[var(--color-ink)]">{m.name || '（尚未填寫）'}</p>
                    <p className="text-xs text-[#9a8674]">{m.role === 'admin' ? '管理員' : PROVIDER_LABEL[m.provider] || '會員'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-mono">{m.email}</p>
                    <p className="text-xs text-[#7a6555]">{m.phone || '—'}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2 py-1 rounded-lg">
                      {m.region || extractRegion(m.shippingAddress || '') || '其他'}
                    </span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <select value={m.level || '一般'} onChange={(e) => updateLevel(m.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${LEVEL_COLOR[m.level || '一般']}`}>
                      {MEMBER_LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </td>
                  <td className="p-4 font-bold text-[var(--color-copper)]">{m.points ?? 0}</td>
                  <td className="p-4 text-xs text-[#9a8674]">
                    {m.createdAt ? format(new Date(m.createdAt), 'yyyy/MM/dd') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#9a8674]">
            <p className="font-bold">{members.length === 0 ? '尚無會員註冊' : '沒有符合篩選條件的會員'}</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedId(null)}>
          <div
            className="w-full max-w-md h-full bg-[#faf6f1] shadow-2xl overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">{selected.name || '（未填寫）'}</h2>
                <p className="text-xs text-[#9a8674] font-mono mt-1">{selected.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="p-2 text-[#7a6555] hover:text-[var(--color-ink)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="surface-warm rounded-xl p-4 space-y-2 text-sm mb-4">
              <p><span className="text-[#9a8674]">電話</span>　{selected.phone || '—'}</p>
              <p><span className="text-[#9a8674]">地址</span>　{selected.shippingAddress || '—'}</p>
              <p><span className="text-[#9a8674]">等級</span>　{selected.level || '一般'}</p>
              <p><span className="text-[#9a8674]">累計消費</span>　<span className="font-black text-[var(--color-copper)]">${memberSpend.toLocaleString()}</span></p>
              <p><span className="text-[#9a8674]">訂單數</span>　{memberOrders.length}</p>
            </div>

            <div className="surface-warm rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-[var(--color-ink)] mb-2">點數調整（目前 {selected.points ?? 0}）</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                  className="w-24 bg-white border border-[#e8d9c8] rounded-lg px-3 py-2 text-sm font-bold"
                />
                <button type="button" disabled={saving} onClick={() => adjustPoints(1)}
                  className="flex items-center gap-1 btn-copper px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" />加點
                </button>
                <button type="button" disabled={saving} onClick={() => adjustPoints(-1)}
                  className="flex items-center gap-1 bg-white border border-[#e8d9c8] px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                  <Minus className="w-3.5 h-3.5" />扣點
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-[var(--color-ink)] mb-3">訂單紀錄</h3>
              {memberOrders.length === 0 ? (
                <p className="text-sm text-[#9a8674] text-center py-8">尚無訂單</p>
              ) : (
                <div className="space-y-2">
                  {memberOrders.slice(0, 20).map((o) => (
                    <div key={o.id} className="surface-warm rounded-xl p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-xs text-[#9a8674]">#{o.id.slice(0, 8)}</span>
                        <span className="font-black text-[var(--color-copper)]">${o.total}</span>
                      </div>
                      <p className="text-xs text-[#7a6555] mt-1">
                        {o.createdAt ? format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm') : ''} · {STATUS_LABEL[o.status] || o.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
