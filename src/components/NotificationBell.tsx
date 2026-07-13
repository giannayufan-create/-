import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationBell({ dark = true }: { dark?: boolean }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 320 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'notifications'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(docs.slice(0, 20));
    });
  }, []);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 16);
      let left = r.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setPanelPos({ top: r.bottom + 8, left, width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter((n) => !n.read).map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })));
  };

  const panel = open ? (
    <>
      <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
      <div
        className="fixed z-[201] bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden"
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="font-bold text-stone-800 text-sm">訂單通知</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-amber-600 font-bold hover:underline">全部已讀</button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-stone-400 text-sm py-8">尚無通知</p>
          ) : (
            notifications.map((n) => (
              <button key={n.id} onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-stone-50 hover:bg-stone-50 ${!n.read ? 'bg-amber-50/50' : ''}`}>
                <p className="text-sm font-bold text-stone-800">{n.title}</p>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 whitespace-pre-line">{n.body?.split('\n').slice(0, 3).join('\n')}</p>
                <p className="text-[10px] text-stone-400 mt-1">{n.createdAt ? format(new Date(n.createdAt), 'MM/dd HH:mm') : ''}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg ${dark ? 'text-stone-300 hover:text-white hover:bg-stone-800' : 'text-stone-600 hover:text-amber-600 hover:bg-stone-100'}`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
