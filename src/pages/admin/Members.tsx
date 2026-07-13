import { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { Search, Download } from 'lucide-react';
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

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('全部');
  const [levelFilter, setLevelFilter] = useState('全部');

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setMembers(docs);
    }, (err) => console.error('會員讀取失敗:', err));
  }, []);

  const filtered = members.filter((m) => {
    const region = m.region || extractRegion(m.shippingAddress || '');
    if (regionFilter !== '全部' && region !== regionFilter) return false;
    if (levelFilter !== '全部' && (m.level || '一般') !== levelFilter) return false;
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.phone?.includes(q);
  });

  const updateLevel = async (id: string, level: string) => {
    await updateDoc(doc(db, 'users', id), { level, updatedAt: new Date().toISOString() });
  };

  const downloadCSV = () => {
    if (!filtered.length) return;
    const headers = ['項次', '姓名', 'Email', '電話', '地區', '等級', '送貨地址', '角色', '註冊方式', '註冊日期'];
    const rows = filtered.map((m, i) => [
      i + 1, m.name, m.email, m.phone,
      m.region || extractRegion(m.shippingAddress || ''),
      m.level || '一般', m.shippingAddress,
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
          <h1 className="text-2xl font-black text-stone-900">會員管理</h1>
          <p className="text-sm text-stone-500">共 {members.length} 人 · 可依地區、等級篩選</p>
        </div>
        <button onClick={downloadCSV} className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-xl text-sm font-bold">
          <Download className="w-4 h-4" />匯出 CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋姓名、Email、電話..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold">
          {TAIWAN_REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold">
          <option>全部</option>
          {MEMBER_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-100 bg-stone-50">
                <th className="text-left p-4 w-12">#</th>
                <th className="text-left p-4">會員</th>
                <th className="text-left p-4">聯絡方式</th>
                <th className="text-left p-4">地區</th>
                <th className="text-left p-4">等級</th>
                <th className="text-left p-4">地址</th>
                <th className="text-left p-4">註冊日期</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                  <td className="p-4 text-xs text-stone-400 font-mono">{i + 1}</td>
                  <td className="p-4">
                    <p className="font-bold text-stone-800">{m.name || '（尚未填寫）'}</p>
                    <p className="text-xs text-stone-400">{m.role === 'admin' ? '管理員' : PROVIDER_LABEL[m.provider] || '會員'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-mono">{m.email}</p>
                    <p className="text-xs text-stone-500">{m.phone || '—'}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                      {m.region || extractRegion(m.shippingAddress || '') || '其他'}
                    </span>
                  </td>
                  <td className="p-4">
                    <select value={m.level || '一般'} onChange={(e) => updateLevel(m.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${LEVEL_COLOR[m.level || '一般']}`}>
                      {MEMBER_LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-xs text-stone-500 max-w-[180px] truncate">{m.shippingAddress || '—'}</td>
                  <td className="p-4 text-xs text-stone-400">
                    {m.createdAt ? format(new Date(m.createdAt), 'yyyy/MM/dd') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="font-bold">{members.length === 0 ? '尚無會員註冊' : '沒有符合篩選條件的會員'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
