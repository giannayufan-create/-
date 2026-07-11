import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from '../lib/store';
import { generateReceiptPDF } from '../lib/pdf';
import { sendOrderEmail, syncOrderToSheet } from '../lib/google';
import { format } from 'date-fns';

export default function Admin() {
  const { userRole, accessToken } = useStore();
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState({ spreadsheetId: '' });
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, stock: 0, imageBase64: '', category: '' });

  useEffect(() => {
    if (userRole !== 'admin') return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(docs);
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    getDoc(doc(db, 'settings', 'global')).then(snap => {
      if (snap.exists()) setSettings(snap.data() as any);
    });

    return () => { unsubProducts(); unsubOrders(); unsubUsers(); };
  }, [userRole]);

  // Background worker for processing pending orders
  useEffect(() => {
    if (userRole !== 'admin' || !accessToken) return;

    const processOrders = async () => {
      const pending = orders.filter(o => o.status === 'pending');
      for (const order of pending) {
        try {
          // 1. Update status immediately to prevent duplicate processing
          await updateDoc(doc(db, 'orders', order.id), { status: 'processing', updatedAt: new Date().toISOString() });
          
          // 2. Sync to Sheets
          if (settings.spreadsheetId) {
            // Need user email. Let's fetch the user
            const uSnap = await getDoc(doc(db, 'users', order.userId));
            const customerEmail = uSnap.exists() ? uSnap.data().email : 'unknown';
            await syncOrderToSheet(accessToken, settings.spreadsheetId, { ...order, customerEmail });
            
            // 3. Generate PDF & Send Email
            const pdfBase64 = generateReceiptPDF(order);
            await sendOrderEmail(accessToken, customerEmail, order, pdfBase64);
          }

          // 4. Update Product Stock and User points
          for (const item of order.items) {
            const pRef = doc(db, 'products', item.productId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              const currentStock = pSnap.data().stock;
              await updateDoc(pRef, { 
                stock: Math.max(0, currentStock - item.quantity),
                updatedAt: new Date().toISOString()
              });
            }
          }
          
          const uRef = doc(db, 'users', order.userId);
          const uSnap2 = await getDoc(uRef);
          if (uSnap2.exists()) {
             // 1 point per dollar spent
             await updateDoc(uRef, {
                points: uSnap2.data().points + Math.floor(order.total),
                updatedAt: new Date().toISOString()
             });
          }

          // 5. Mark processed
          await updateDoc(doc(db, 'orders', order.id), { status: 'processed', updatedAt: new Date().toISOString() });
        } catch (e) {
          console.error("Failed to process order", e);
          await updateDoc(doc(db, 'orders', order.id), { status: 'pending', updatedAt: new Date().toISOString() }); // revert
        }
      }
    };

    if (orders.length > 0) {
      processOrders();
    }
  }, [orders, userRole, accessToken, settings.spreadsheetId]);

  const handleImageDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewProduct(prev => ({ ...prev, imageBase64: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'products'), {
      ...newProduct,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setNewProduct({ name: '', description: '', price: 0, stock: 0, imageBase64: '', category: '' });
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const saveSettings = async () => {
    await setDoc(doc(db, 'settings', 'global'), {
      ...settings,
      updatedAt: new Date().toISOString()
    });
    alert('Settings saved!');
  };

  if (userRole !== 'admin') {
    return <div className="text-center py-12">Access Denied. Admin only.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
      <div className="flex gap-6 border-b border-slate-200 mb-8">
        <button onClick={() => setActiveTab('orders')} className={`pb-4 px-2 font-bold text-sm tracking-wide ${activeTab === 'orders' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>最新訂單處理</button>
        <button onClick={() => setActiveTab('products')} className={`pb-4 px-2 font-bold text-sm tracking-wide ${activeTab === 'products' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>商品目錄管理</button>
        <button onClick={() => setActiveTab('customers')} className={`pb-4 px-2 font-bold text-sm tracking-wide ${activeTab === 'customers' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>客戶資料</button>
        <button onClick={() => setActiveTab('settings')} className={`pb-4 px-2 font-bold text-sm tracking-wide ${activeTab === 'settings' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>系統設定</button>
      </div>

      {activeTab === 'customers' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">客戶與會員資料</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  <th className="py-2">姓名/店名</th>
                  <th className="py-2">聯絡電話</th>
                  <th className="py-2">收件地址</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">會員狀態</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700">{u.storeName || u.name}</td>
                    <td className="py-4 text-slate-600">{u.phone || '-'}</td>
                    <td className="py-4 text-slate-600">{u.address || '-'}</td>
                    <td className="py-4 text-slate-500">{u.email}</td>
                    <td className="py-4">
                      {u.isProfileComplete ? (
                         <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">資料完整</span>
                      ) : (
                         <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">未填寫完整</span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">目前沒有客戶資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">最新訂單處理</h3>
          </div>
          {!accessToken && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 text-sm font-medium">
              ⚠️ Warning: You don't have an active Google Workspace token. Orders will not be synced to Sheets or emailed. Please re-authenticate.
            </div>
          )}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  <th className="py-2">訂單編號</th>
                  <th className="py-2">日期</th>
                  <th className="py-2">項目</th>
                  <th className="py-2">總額</th>
                  <th className="py-2">狀態</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-mono font-bold text-slate-700">#{order.id.slice(0, 8)}</td>
                    <td className="py-4 text-slate-600">{format(new Date(order.createdAt), 'yyyy.MM.dd')}</td>
                    <td className="py-4 text-slate-600">{order.items.map((i: any) => `${i.name} x ${i.quantity}`).join(', ')}</td>
                    <td className="py-4 font-bold text-slate-800">${order.total.toFixed(2)}</td>
                    <td className="py-4">
                      {order.status === 'processed' ? (
                         <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">已完成</span>
                      ) : (
                         <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">處理中</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">目前沒有訂單</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4 text-slate-800">新增食品項</h2>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">名稱</label>
                <input required type="text" className="mt-1 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">描述</label>
                <textarea className="mt-1 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">價格 ($)</label>
                  <input required type="number" step="0.01" className="mt-1 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">庫存數量</label>
                  <input required type="number" className="mt-1 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">商品圖片 (拖拽上傳)</label>
                <div 
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleImageDrop}
                  className="border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:border-emerald-400 transition-colors group cursor-pointer p-6 relative overflow-hidden"
                >
                  {newProduct.imageBase64 ? (
                    <img src={newProduct.imageBase64} alt="Preview" className="h-32 object-cover rounded-lg" />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-200 mb-3 group-hover:scale-110 transition-transform">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      </div>
                      <p className="text-sm font-bold text-slate-500">快速拖入圖片</p>
                      <p className="text-[10px] uppercase tracking-widest mt-1">上傳新商品</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageDrop} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all mt-4">新增商品</button>
            </form>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-800">目前庫存目錄</h2>
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow group">
                  <div className="h-16 w-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                    {p.imageBase64 && <img src={p.imageBase64} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{p.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">庫存: <span className={p.stock <= 5 ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>{p.stock}</span> <span className="mx-2">|</span> ${p.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => deleteProduct(p.id)} className="text-slate-400 hover:text-red-500 text-sm p-2 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">刪除</button>
                </div>
              ))}
              {products.length === 0 && <p className="text-slate-500 font-medium py-4">目前沒有任何商品</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-lg">
          <h2 className="text-xl font-bold mb-6 text-slate-800">Google Sheets 同步設定</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">試算表 ID (Spreadsheet ID)</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                placeholder="e.g. 1BxiMvs0X15uQaPq..."
                value={settings.spreadsheetId}
                onChange={e => setSettings({...settings, spreadsheetId: e.target.value})}
              />
              <p className="text-[11px] text-slate-500 mt-2 font-medium">請在您的 Google 試算表 URL 中找到此 ID。並確保試算表中包含名為 "Orders" 的工作表。</p>
            </div>
            <button onClick={saveSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all">儲存設定</button>
          </div>
        </div>
      )}
    </div>
  );
}
