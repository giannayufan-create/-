import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { initAuth, googleSignIn, logout, db } from '../lib/firebase';
import { useStore } from '../lib/store';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ShoppingCart, LayoutDashboard, User as UserIcon, LogOut, Package, Store } from 'lucide-react';

export default function Layout() {
  const { user, userRole, setUser, cart } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = initAuth(async (authUser, token) => {
      // Fetch user role
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);
      let role: 'admin' | 'member' = 'member';
      let userData: any = null;
      
      if (!userSnap.exists()) {
        // Create user
        const newUserData = {
          role: 'member',
          name: authUser.displayName || 'Anonymous',
          email: authUser.email,
          points: 0,
          isProfileComplete: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, newUserData);
        userData = newUserData;
      } else {
        userData = userSnap.data();
        role = userData.role;
      }
      
      setUser(authUser, role, token, userData);
    }, () => {
      setUser(null, null, null, null);
      navigate('/');
    });

    return () => unsubscribe();
  }, [setUser, navigate]);

  const handleLogin = async () => {
    await googleSignIn();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const [setupData, setSetupData] = useState({ name: '', phone: '', address: '', storeName: '' });
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingSetup(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates = {
        name: setupData.name,
        phone: setupData.phone,
        address: setupData.address,
        storeName: setupData.storeName,
        isProfileComplete: true,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, updates);
      // Update local store
      setUser(user, userRole, useStore.getState().accessToken, { ...useStore.getState().userData, ...updates });
    } catch (error) {
      console.error('Setup error:', error);
      alert('儲存失敗');
    } finally {
      setIsSubmittingSetup(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Profile Setup Modal */}
      {useStore.getState().userData && !useStore.getState().userData?.isProfileComplete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">歡迎來到 FreshFlow OS!</h2>
            <p className="text-slate-500 mb-6 text-sm">請完成您的個人或店家資料以開始使用。</p>
            <form onSubmit={handleProfileSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">姓名或店名</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} placeholder="輸入姓名或店名" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">聯絡電話</label>
                <input required type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={setupData.phone} onChange={e => setSetupData({...setupData, phone: e.target.value})} placeholder="例如: 0912345678" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">地址</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={setupData.address} onChange={e => setSetupData({...setupData, address: e.target.value})} placeholder="輸入收件地址" />
              </div>
              <button disabled={isSubmittingSetup} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all mt-4">
                {isSubmittingSetup ? '儲存中...' : '完成設定'}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm italic font-bold text-[10px] flex items-center justify-center text-white">F</div>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">FreshFlow <span className="text-emerald-600 font-medium text-sm ml-1">OS</span></span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">權限</p>
                <p className="text-sm font-bold text-emerald-700">{userRole === 'admin' ? '管理員' : '黃金會員'}</p>
              </div>
              <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all" onClick={handleLogout} title="Click to log out">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`} alt="Avatar" />
                </div>
                <div className="leading-none hidden sm:block">
                  <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {userRole === 'admin' ? (
                      <Link to="/admin" className="text-[10px] text-slate-500 hover:text-emerald-600 font-bold uppercase tracking-wide">管理後台</Link>
                    ) : (
                      <Link to="/orders" className="text-[10px] text-slate-500 hover:text-emerald-600 font-bold uppercase tracking-wide">訂單歷史</Link>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              Sign In
            </button>
          )}

          <div className="border-l border-slate-200 pl-6">
             <Link to="/cart" className="text-slate-400 hover:text-emerald-600 relative transition-colors block">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {totalItems}
                  </span>
                )}
             </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 w-full max-w-7xl mx-auto flex flex-col">
        <Outlet />
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-slate-800 text-slate-400 px-8 flex items-center justify-between text-[10px] tracking-wide shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 線上服務正常</span>
          <span className="text-slate-600">|</span>
          <span>Google AI Studio 即時預覽</span>
        </div>
        <div className="flex items-center gap-4">
          <span>支援導出至 GitHub / Vercel 部署</span>
          <span>v1.0.0-stable</span>
        </div>
      </footer>
    </div>
  );
}
