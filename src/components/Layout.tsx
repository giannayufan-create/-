import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { initAuth, googleSignIn, logout, db } from '../lib/firebase';
import { useStore } from '../lib/store';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
      
      if (!userSnap.exists()) {
        // Create user
        await setDoc(userRef, {
          role: 'member',
          name: authUser.displayName || 'Anonymous',
          email: authUser.email,
          points: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        role = userSnap.data().role;
      }
      
      setUser(authUser, role, token);
    }, () => {
      setUser(null, null, null);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
    </div>
  );
}
