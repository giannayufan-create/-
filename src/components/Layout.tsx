import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { initAuth, googleSignIn, facebookSignIn, yahooSignIn, loginWithEmail, registerWithEmail, logout, db, resetPassword } from '../lib/firebase';
import { useStore } from '../lib/store';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ShoppingCart, LayoutDashboard, User as UserIcon, LogOut, Package, Store, Mail, X, Eye, EyeOff } from 'lucide-react';

export default function Layout() {
  const { user, userRole, userData, setUser, cart, isAuthLoading, setAuthLoading, isAuthModalOpen, setAuthModalOpen, isProfileModalOpen, setProfileModalOpen } = useStore();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(async (authUser, token) => {
      try {
        // Fetch user role
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        let role: 'admin' | 'member' = 'member';
        let userData: any = null;
        
        const userEmail = (authUser.email || '').toLowerCase();
        const isAdminEmail = userEmail === 'giannayufan@gmail.com' || userEmail === 'ko520940@gmail.com';
        
        if (!userSnap.exists()) {
          // Create user
          const newUserData = {
            role: isAdminEmail ? 'admin' : 'member',
            name: authUser.displayName || 'Anonymous',
            email: authUser.email || '',
            points: 0,
            isProfileComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          userData = newUserData;
          role = newUserData.role as 'admin' | 'member';
          // Fire and forget so we don't block login if offline
          setDoc(userRef, newUserData).catch(e => console.warn("Could not create user doc", e));
        } else {
          userData = userSnap.data();
          role = userData.role || 'member';
          
          // Auto-upgrade if it's the admin email but not admin yet
          if (isAdminEmail && role !== 'admin') {
             role = 'admin';
             userData.role = 'admin';
             updateDoc(userRef, { role: 'admin', updatedAt: new Date().toISOString() }).catch(e => console.warn("Could not auto-upgrade admin role", e));
          }
        }
        
        // Ensure isProfileComplete is set properly
        if (userData && typeof userData.isProfileComplete !== 'boolean') {
           userData.isProfileComplete = false;
        }

        setUser(authUser, role, token, userData);
        setAuthModalOpen(false);
      } catch (err) {
        console.error("Error setting up user session:", err);
        // Do not force isProfileComplete: false if there is an error, avoid trapping user
        const userEmailFallback = (authUser.email || '').toLowerCase();
        const isAdminFallback = userEmailFallback === 'giannayufan@gmail.com' || userEmailFallback === 'ko520940@gmail.com';
        const fallbackRole = isAdminFallback ? 'admin' : 'member';
        setUser(authUser, fallbackRole, token, { name: authUser.displayName || 'Anonymous', role: fallbackRole, isProfileComplete: true });
        setAuthModalOpen(false);
      }
    }, () => {
      console.log("Firebase onAuthStateChanged fired with null user");
      setUser(null, null, null, null);
    });

    return () => unsubscribe();
  }, [setUser, navigate, setAuthModalOpen]);

  const handleProviderLogin = async (providerName: string, providerFn: () => Promise<any>) => {
    setAuthError('');
    try {
      await providerFn();
      setAuthModalOpen(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error(`${providerName} Login error:`, error);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('登入失敗：這個網域尚未被授權。請至 Firebase 控制台加入您的網址。');
      } else {
        setAuthError(`登入發生錯誤: ${error.message || '請稍後再試'}`);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('請填寫信箱和密碼');
      return;
    }

    if (authMode === 'register') {
      if (password !== confirmPassword) {
        setAuthError('兩次輸入的密碼不一致');
        return;
      }
      if (password.length < 6 || !/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
        setAuthError('密碼必須至少6個字元，且包含大小寫英文字母');
        return;
      }
    }
    
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      setAuthModalOpen(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error('Email Auth error:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setAuthError('帳號或密碼錯誤');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('這個信箱已經註冊過了');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('密碼強度太弱 (請至少輸入6個字元)');
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError('嘗試次數過多被鎖定，請稍後再試，或重設密碼。');
      } else {
        setAuthError(`登入失敗: ${error.message}`);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError('請填寫您的電子郵件以重設密碼');
      return;
    }
    try {
      await resetPassword(email);
      setAuthError('密碼重設信件已發送，請檢查您的信箱！');
    } catch (error: any) {
      console.error('Password reset error:', error);
      setAuthError(`重設密碼失敗: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const [setupData, setSetupData] = useState({ name: '', phone: '', billingAddress: '', shippingAddress: '' });
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (userData) {
      setSetupData({
        name: userData.name || '',
        phone: userData.phone || '',
        billingAddress: userData.billingAddress || '',
        shippingAddress: userData.shippingAddress || ''
      });
    }
  }, [userData, isProfileModalOpen]);

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingSetup(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates = {
        name: setupData.name,
        phone: setupData.phone,
        billingAddress: setupData.billingAddress,
        shippingAddress: setupData.shippingAddress,
        isProfileComplete: true,
        updatedAt: new Date().toISOString()
      };
      
      // Fire and forget to avoid hanging if offline or connection issues
      setDoc(userRef, updates, { merge: true }).catch(err => console.error("Save error in background:", err));

      // Update local store immediately
      setUser(user, userRole, useStore.getState().accessToken, { ...userData, ...updates });
      setProfileModalOpen(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error('Setup error:', error);
      alert('儲存失敗: ' + (error.message || '未知錯誤'));
    } finally {
      setIsSubmittingSetup(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="font-bold">登入成功！</span>
        </div>
      )}

      {/* Login Modal */}
      {isAuthModalOpen && !user && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <button onClick={() => setAuthModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 border-2 border-emerald-600 rounded-sm italic font-bold text-sm flex items-center justify-center text-emerald-600">F</div>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">歡迎來到 滷味小哥路人甲</h2>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  登入
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  註冊新帳號
                </button>
              </div>

              {authError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
                  {authError}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" placeholder="name@example.com" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">密碼</label>
                    {authMode === 'login' && (
                      <button type="button" onClick={handleResetPassword} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        忘記密碼？
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {authMode === 'register' && <p className="text-xs text-slate-500 mt-1">密碼必須至少6個字元，且包含大小寫英文字母</p>}
                </div>
                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">再次確認密碼</label>
                    <div className="relative">
                      <input required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all">
                  {authMode === 'login' ? '登入' : '註冊帳號'}
                </button>
              </form>

              <div className="relative flex items-center py-2 mb-6">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">或其他登入方式</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-3">
                <button type="button" onClick={() => handleProviderLogin('Google', googleSignIn)} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl transition-all shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  使用 Google 登入
                </button>
                <button type="button" onClick={() => handleProviderLogin('Facebook', facebookSignIn)} className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  使用 Facebook 登入
                </button>
                <button type="button" onClick={() => handleProviderLogin('Yahoo', yahooSignIn)} className="w-full flex items-center justify-center gap-2 bg-[#430297] hover:bg-[#320170] text-white font-medium py-2.5 rounded-xl transition-all shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 100 100">
                    <path d="M47.45 61.27l-24.9-39.73h15.93l16.14 27.56L68.79 21.54h14.73l-26.69 39.46v21.5h-9.38v-21.23z" />
                  </svg>
                  使用 Yahoo 登入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Setup Modal */}
      {userData && (!userData.isProfileComplete || isProfileModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
            {isProfileModalOpen && (
              <button onClick={() => setProfileModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{isProfileModalOpen ? '修改基本資料' : '歡迎來到 滷味小哥路人甲!'}</h2>
            <p className="text-slate-500 mb-6 text-sm">{isProfileModalOpen ? '請更新您的個人或店家資料。' : '請完成您的個人或店家資料以開始使用。'}</p>
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
                <label className="block text-sm font-bold text-slate-700 mb-1">通訊地址</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={setupData.billingAddress} onChange={e => setSetupData({...setupData, billingAddress: e.target.value})} placeholder="輸入通訊地址" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">送貨地址</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={setupData.shippingAddress} onChange={e => setSetupData({...setupData, shippingAddress: e.target.value})} placeholder="輸入送貨地址" />
              </div>
              <button disabled={isSubmittingSetup} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all mt-4">
                {isSubmittingSetup ? '儲存中...' : '完成設定'}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm italic font-bold text-[10px] flex items-center justify-center text-white">F</div>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">滷味小哥路人甲 <span className="text-emerald-600 font-medium text-sm ml-1 hidden sm:inline">線上訂購</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 pl-6 border-l border-slate-200">
            <Link to="/" className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors">菜單</Link>
            {user && userRole === 'admin' && (
              <Link to="/admin" className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors">管理後台</Link>
            )}
            {user && userRole !== 'admin' && (
              <Link to="/orders" className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors">我的訂單</Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAuthLoading ? (
            <div className="w-24 h-10 bg-slate-100 rounded-xl animate-pulse hidden md:block"></div>
          ) : user ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  已登入
                </p>
                <p className="text-sm font-bold text-emerald-700">{userRole === 'admin' ? '管理員' : '會員'}</p>
              </div>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-6 relative" ref={menuRef}>
                <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all flex items-center justify-center text-slate-600" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || user.email || 'User'}`} alt="Avatar" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="leading-none hidden sm:block">
                  <p className="text-sm font-bold text-slate-800">{user.displayName || user.email || '會員'}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-medium">{userRole === 'admin' ? '管理員' : '一般會員'}</p>
                </div>
                
                {showProfileMenu && (
                  <div className="absolute top-12 right-0 sm:right-auto sm:left-6 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 mb-2 sm:hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{user.displayName || user.email || '會員'}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">{userRole === 'admin' ? '管理員' : '一般會員'}</p>
                    </div>
                    {userRole === 'admin' ? (
                      <Link to="/admin" onClick={() => setShowProfileMenu(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">管理後台</Link>
                    ) : (
                      <Link to="/orders" onClick={() => setShowProfileMenu(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">訂單歷史</Link>
                    )}
                    <button onClick={() => { setProfileModalOpen(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">修改基本資料</button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button onClick={() => { handleLogout(); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">登出</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="hidden md:block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              登入 / 註冊
            </button>
          )}

          <div className="hidden md:block border-l border-slate-200 pl-6">
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

      <main className="flex-1 p-4 sm:p-8 w-full max-w-7xl mx-auto flex flex-col pb-20 sm:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 px-2 z-40 pb-safe">
        <Link to="/" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-emerald-600">
          <Store className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">菜單</span>
        </Link>
        <Link to="/cart" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-emerald-600 relative">
          <ShoppingCart className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">購物車</span>
          {totalItems > 0 && (
            <span className="absolute top-1 right-5 bg-emerald-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
              {totalItems}
            </span>
          )}
        </Link>
        {user ? (
          userRole === 'admin' ? (
            <Link to="/admin" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-emerald-600">
              <LayoutDashboard className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">管理</span>
            </Link>
          ) : (
            <Link to="/orders" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-emerald-600">
              <Package className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">訂單</span>
            </Link>
          )
        ) : null}
        <button onClick={() => user ? setProfileModalOpen(true) : setAuthModalOpen(true)} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-emerald-600">
          <UserIcon className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">{user ? '會員' : '登入'}</span>
        </button>
      </div>

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
