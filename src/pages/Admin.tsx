import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from '../lib/store';
import { generateReceiptPDF } from '../lib/pdf';
import { sendOrderEmail, syncOrderToSheet } from '../lib/google';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ShieldAlert, 
  FileSpreadsheet, 
  Package, 
  Users, 
  Settings as SettingsIcon, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';

export default function Admin() {
  const { userRole, accessToken } = useStore();
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState({ 
    spreadsheetId: '',
    ecpayEnabled: false,
    linepayEnabled: false,
    lalamoveEnabled: false,
    linenotifyEnabled: false,
    ecpayMerchantId: '',
    ecpayHashKey: '',
    ecpayHashIv: '',
    linepayChannelId: '',
    linepaySecret: '',
    lalamoveApiKey: '',
    lalamoveApiSecret: '',
    linenotifyToken: ''
  });
  
  // Search and filter states
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Editing state
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ price: 0, stock: 0 });
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, stock: 0, imageBase64: '', category: '火鍋料' });

  // Submitting / loading states
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);

  // Custom Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      showToast('目前沒有資料可供下載', 'error');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        let value = row[fieldName];
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    
    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('報表下載成功！', 'success');
  };

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
      if (snap.exists()) setSettings(prev => ({ ...prev, ...snap.data() }));
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
          showToast(`已成功自動處理新訂單 #${order.id.slice(0, 8)}！`, 'success');
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
        showToast('圖片載入成功，請點選新增商品！', 'info');
      };
      reader.readAsDataURL(file);
    } else if (file) {
      showToast('必須為圖片格式檔案！', 'error');
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingProduct) return;

    // Form validation checks
    const trimmedName = newProduct.name.trim();
    if (!trimmedName) {
      showToast('商品名稱不能為空！', 'error');
      return;
    }

    if (newProduct.price <= 0) {
      showToast('商品價格必須大於 0 元！', 'error');
      return;
    }

    if (newProduct.stock < 0) {
      showToast('庫存數量不能小於 0 份！', 'error');
      return;
    }

    // Check duplicate name
    const isDuplicate = products.some(p => p.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      const confirmAdd = window.confirm(`警告：已有名為「${trimmedName}」的商品。您確定還要繼續新增一項重複名稱的商品嗎？`);
      if (!confirmAdd) return;
    }

    setIsAddingProduct(true);
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        name: trimmedName,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setNewProduct({ name: '', description: '', price: 0, stock: 0, imageBase64: '', category: '火鍋料' });
      showToast(`商品「${trimmedName}」新增成功！`, 'success');
    } catch (error: any) {
      console.error('Add product error:', error);
      showToast('新增商品失敗，請稍後再試！', 'error');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const saveProductEdit = async (id: string, name: string) => {
    if (editValues.price <= 0) {
      showToast('修改價格必須大於 0 元！', 'error');
      return;
    }
    if (editValues.stock < 0) {
      showToast('庫存不能小於 0！', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'products', id), {
        price: Number(editValues.price),
        stock: Number(editValues.stock),
        updatedAt: new Date().toISOString()
      });
      setEditingProduct(null);
      showToast(`商品「${name}」已儲存更新！`, 'success');
    } catch (error: any) {
      console.error('Edit product error:', error);
      showToast('更新商品失敗！', 'error');
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (isDeletingProduct) return;
    
    const confirmDelete = window.confirm(`確認：您確定要永久刪除「${name}」商品嗎？此操作將無法復原！`);
    if (!confirmDelete) return;

    setIsDeletingProduct(id);
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast(`商品「${name}」已成功下架刪除！`, 'success');
    } catch (error: any) {
      console.error('Delete product error:', error);
      showToast('刪除商品失敗！', 'error');
    } finally {
      setIsDeletingProduct(null);
    }
  };

  const saveSettings = async () => {
    if (isSavingSettings) return;

    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showToast('Google Sheets 同步設定已成功更新儲存！', 'success');
    } catch (error: any) {
      console.error('Save settings error:', error);
      showToast('儲存設定失敗，請檢查權限！', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    setIsUpdatingOrder(id);
    try {
      await updateDoc(doc(db, 'orders', id), { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      });
      showToast(`訂單 #${id.slice(0, 8)} 狀態已成功更新為「${
        newStatus === 'pending' ? '待處理' :
        newStatus === 'processing' ? '處理中' :
        newStatus === 'processed' ? '已完成' : '已取消'
      }」！`, 'success');
    } catch (error) {
      console.error('Update status error:', error);
      showToast('更新訂單狀態失敗', 'error');
    } finally {
      setIsUpdatingOrder(null);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[500px]">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">權限不足</h2>
          <p className="text-slate-500 mb-6 leading-relaxed">
            您目前的帳號沒有進入管理系統的權限。請確認是否登入了正確的管理員帳號。
          </p>
        </div>
      </div>
    );
  }

  // Calculated Stats Overview (based on live data)
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const activeOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col px-4 md:px-8 py-6 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
            'bg-sky-50 text-sky-800 border-sky-200'
          }`}>
            <div className="flex-shrink-0">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === 'info' && <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />}
            </div>
            <p className="text-sm font-bold flex-1">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header and Title */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-1.5 bg-emerald-600 text-white rounded-xl"><ShieldAlert className="w-6 h-6" /></span>
            滷味小哥路人甲 - 系統管理後台
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">即時商品目錄管理、最新訂單自動化同步處理與報表匯出。</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            管理員模式在線
          </span>
        </div>
      </div>

      {/* Quick Overview Bento Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">營業額 (已成交)</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">${totalRevenue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">待處理訂單</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">
              {activeOrdersCount} <span className="text-xs text-slate-400 font-normal">筆</span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">低庫存警告</p>
            <h3 className={`text-xl md:text-2xl font-black mt-0.5 ${lowStockCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {lowStockCount} <span className="text-xs text-slate-400 font-normal">品項</span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">會員客戶數</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">
              {users.length} <span className="text-xs text-slate-400 font-normal">人</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 p-1.5 rounded-2xl mb-8 shrink-0 no-scrollbar">
        <button 
          onClick={() => setActiveTab('orders')} 
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs tracking-wide whitespace-nowrap transition-all ${
            activeTab === 'orders' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          訂單管理處理 ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs tracking-wide whitespace-nowrap transition-all ${
            activeTab === 'products' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Plus className="w-4 h-4" />
          商品目錄管理 ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('customers')} 
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs tracking-wide whitespace-nowrap transition-all ${
            activeTab === 'customers' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          客戶會員資料 ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs tracking-wide whitespace-nowrap transition-all ${
            activeTab === 'reports' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          銷售月報表
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs tracking-wide whitespace-nowrap transition-all ${
            activeTab === 'settings' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Google 同步設定
        </button>
        <button 
          onClick={() => setActiveTab('integrations')} 
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs tracking-wide whitespace-nowrap transition-all ${
            activeTab === 'integrations' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          外掛整合與系統升級
        </button>
      </div>

      {/* Main Tab Panels Content */}

      {/* TAB: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Package className="text-emerald-600 w-5 h-5" />
                最新訂單處理
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">查看客戶提交之即時滷味與火鍋料點購訂單，可修改處理狀態。</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="搜尋訂單、姓名或電話..." 
                  className="pl-9 pr-4 py-1.5 bg-slate-50 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-60"
                />
              </div>
              <button 
                onClick={() => downloadCSV(orders, 'orders_export.csv')} 
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                下載訂單 Excel (CSV)
              </button>
            </div>
          </div>

          {!accessToken && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl mb-6 text-xs font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Google API 存取權杖失效或未授權</p>
                <p className="mt-0.5 opacity-90">目前系統無法連線至您的 Google 試算表。新成立的訂單將暫時無法自動同步與發送明信信件，請在 Layout 首頁重新進行 Google 登入認證。</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                  <th className="py-3 px-4 font-bold">訂單編號</th>
                  <th className="py-3 px-4 font-bold">客戶資訊</th>
                  <th className="py-3 px-4 font-bold">下單日期</th>
                  <th className="py-3 px-4 font-bold">購買細項</th>
                  <th className="py-3 px-4 font-bold">消費總額</th>
                  <th className="py-3 px-4 font-bold text-center">處理狀態</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {orders
                  .filter(order => {
                    const searchLower = orderSearch.toLowerCase();
                    return (
                      order.id.toLowerCase().includes(searchLower) ||
                      (order.customerName || '').toLowerCase().includes(searchLower) ||
                      (order.customerPhone || '').toLowerCase().includes(searchLower) ||
                      (order.items || []).some((item: any) => item.name.toLowerCase().includes(searchLower))
                    );
                  })
                  .map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{order.customerName || '未命名客戶'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{order.customerPhone || '-'}</div>
                        {order.shippingAddress && (
                          <div className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5" title={order.shippingAddress}>
                            送貨: {order.shippingAddress}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm') : '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {order.items.map((i: any, index: number) => (
                            <span key={index} className="bg-slate-50 text-slate-600 border border-slate-100 px-1.5 py-0.5 rounded-md">
                              {i.name} × {i.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-700 text-base">
                        ${(order.total || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center items-center gap-1.5">
                          <select 
                            value={order.status} 
                            disabled={isUpdatingOrder === order.id}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer transition-all ${
                              order.status === 'processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-50 text-slate-600'
                            }`}
                          >
                            <option value="pending">待處理 (Pending)</option>
                            <option value="processing">處理中 (Processing)</option>
                            <option value="processed">已完成 (Processed)</option>
                            <option value="cancelled">已取消 (Cancelled)</option>
                          </select>
                          {isUpdatingOrder === order.id && (
                            <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">目前沒有任何訂單</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Add Product Form Column */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-4 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Plus className="text-emerald-600 w-5 h-5" />
                新增食品項 (防呆輸入)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">提供自動阻擋重複名稱、空值、負數防呆機制與圖片即時預覽。</p>
            </div>
            
            <form onSubmit={addProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600">商品名稱 <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="text" 
                    placeholder="例如: 爆漿貢丸"
                    disabled={isAddingProduct}
                    className="mt-1.5 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50" 
                    value={newProduct.name} 
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">分類 <span className="text-red-500">*</span></label>
                  <select 
                    disabled={isAddingProduct}
                    className="mt-1.5 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50 font-bold" 
                    value={newProduct.category} 
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option value="火鍋料">火鍋料</option>
                    <option value="水餃">水餃</option>
                    <option value="滷味">滷味</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600">商品細節描述</label>
                <textarea 
                  placeholder="請填入滷味食品特點或包裝說明..."
                  disabled={isAddingProduct}
                  className="mt-1.5 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50 h-20 resize-none" 
                  value={newProduct.description} 
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600">售價 (NT$) <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    placeholder="50"
                    disabled={isAddingProduct}
                    className="mt-1.5 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50" 
                    value={newProduct.price || ''} 
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">可販售庫存數量 <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    placeholder="100"
                    disabled={isAddingProduct}
                    className="mt-1.5 block w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50" 
                    value={newProduct.stock || '0'} 
                    onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">商品圖檔 (支援拖曳上傳與點擊選擇)</label>
                <div 
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleImageDrop}
                  className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100/50 hover:border-emerald-400 transition-all group cursor-pointer p-4 relative overflow-hidden h-32"
                >
                  {newProduct.imageBase64 ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                      <img src={newProduct.imageBase64} alt="Preview" className="h-full object-contain rounded-xl" />
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNewProduct(p => ({ ...p, imageBase64: '' }));
                        }} 
                        className="absolute top-1 right-1 bg-red-100 text-red-700 p-1 rounded-full hover:bg-red-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-slate-200 mb-2 group-hover:scale-105 transition-transform shadow-sm text-slate-500">
                         <Plus className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] font-black text-slate-600">拉入圖片 或 點擊此處上傳</p>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">JPG / PNG 格式</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    disabled={isAddingProduct}
                    onChange={handleImageDrop} 
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isAddingProduct}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-emerald-600/10 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isAddingProduct ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在新增商品至目錄中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    確認新增商品項
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Product Directory Listings */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Package className="text-emerald-600 w-5 h-5" />
                    目前庫存目錄管理
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">即時修改庫存及售價，或進行商品下架刪除。</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="關鍵字搜尋商品..." 
                      className="pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-40"
                    />
                  </div>
                  <button 
                    onClick={() => downloadCSV(products, 'products_catalog.csv')} 
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold transition-colors flex items-center gap-1 justify-center"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    匯出 CSV
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
                {['水餃', '火鍋料', '滷味'].map(category => {
                  const filteredCategoryProducts = products.filter(p => {
                    const matchesCategory = p.category === category;
                    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                                          (p.description || '').toLowerCase().includes(productSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  });

                  if (filteredCategoryProducts.length === 0) return null;
                  
                  return (
                    <div key={category} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <h3 className="text-xs font-black text-emerald-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {category} ({filteredCategoryProducts.length})
                      </h3>
                      <div className="space-y-3">
                        {filteredCategoryProducts.map(p => (
                          <div key={p.id} className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-4 hover:shadow-sm transition-all">
                            <div className="h-14 w-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center text-slate-300">
                              {p.imageBase64 ? (
                                <img src={p.imageBase64} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5" />
                              )}
                            </div>
                            
                            {editingProduct === p.id ? (
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">價格 (元)</label>
                                  <input 
                                    type="number" 
                                    step="1" 
                                    min="1"
                                    value={editValues.price} 
                                    onChange={e => setEditValues({...editValues, price: Number(e.target.value)})} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">庫存 (份)</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={editValues.stock} 
                                    onChange={e => setEditValues({...editValues, stock: Number(e.target.value)})} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none" 
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-xs truncate" title={p.name}>{p.name}</h3>
                                {p.description && <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.description}</p>}
                                <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-600">
                                  <span>售價: <strong className="text-slate-800 font-black">${(p.price || 0).toFixed(0)}</strong></span>
                                  <span className="text-slate-200">|</span>
                                  <span>庫存: <strong className={p.stock <= 5 ? "text-red-500 font-bold" : "text-emerald-700 font-bold"}>{p.stock || 0}</strong> 份</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Actions layout - ALWAYS visible and accessible */}
                            <div className="flex flex-row sm:flex-col gap-1.5 justify-end">
                              {editingProduct === p.id ? (
                                <>
                                  <button 
                                    onClick={() => saveProductEdit(p.id, p.name)} 
                                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    儲存
                                  </button>
                                  <button 
                                    onClick={() => setEditingProduct(null)} 
                                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    取消
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => { setEditingProduct(p.id); setEditValues({ price: p.price, stock: p.stock }); }} 
                                    className="text-[10px] bg-slate-50 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    編輯
                                  </button>
                                  <button 
                                    onClick={() => deleteProduct(p.id, p.name)} 
                                    disabled={isDeletingProduct === p.id}
                                    className="text-[10px] bg-slate-50 border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-slate-500 font-bold px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    下架
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Other categories */}
                {products.some(p => !['水餃', '火鍋料', '滷味'].includes(p.category)) && (
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-black text-slate-600 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      其他分類
                    </h3>
                    <div className="space-y-3">
                      {products
                        .filter(p => !['水餃', '火鍋料', '滷味'].includes(p.category) && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(p => (
                          <div key={p.id} className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-4 hover:shadow-sm transition-all">
                            <div className="h-14 w-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center text-slate-300">
                              {p.imageBase64 ? (
                                <img src={p.imageBase64} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5" />
                              )}
                            </div>
                            
                            {editingProduct === p.id ? (
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">價格</label>
                                  <input type="number" step="1" value={editValues.price} onChange={e => setEditValues({...editValues, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">庫存</label>
                                  <input type="number" value={editValues.stock} onChange={e => setEditValues({...editValues, stock: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-xs truncate">{p.name}</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">{p.category}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-600">
                                  <span>售價: <strong className="text-slate-800 font-black">${(p.price || 0).toFixed(0)}</strong></span>
                                  <span className="text-slate-200">|</span>
                                  <span>庫存: <strong className={p.stock <= 5 ? "text-red-500 font-bold" : "text-emerald-700 font-bold"}>{p.stock || 0}</strong> 份</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex flex-row sm:flex-col gap-1.5 justify-end">
                              {editingProduct === p.id ? (
                                <>
                                  <button onClick={() => saveProductEdit(p.id, p.name)} className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                    <Check className="w-3.5 h-3.5" /> 儲存
                                  </button>
                                  <button onClick={() => setEditingProduct(null)} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                    <X className="w-3.5 h-3.5" /> 取消
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingProduct(p.id); setEditValues({ price: p.price, stock: p.stock }); }} className="text-[10px] bg-slate-50 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all">
                                    <Edit2 className="w-3.5 h-3.5" /> 編輯
                                  </button>
                                  <button onClick={() => deleteProduct(p.id, p.name)} className="text-[10px] bg-slate-50 border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-slate-500 font-bold px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" /> 刪除
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {products.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold">
                    目前尚未新增任何商品目錄。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-600 w-5 h-5" />
                客戶與會員資料
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">管理註冊會員的店名、電話、配送與通訊地址，並可下載 Excel CSV 報表。</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="搜尋姓名、信箱或電話..." 
                  className="pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
                />
              </div>
              <button 
                onClick={() => downloadCSV(users, 'customers_list.csv')} 
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded-xl font-bold transition-colors flex items-center gap-1.5 justify-center"
              >
                <FileSpreadsheet className="w-4 h-4" />
                下載 Excel (CSV)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  <th className="py-3 px-4">姓名/店名</th>
                  <th className="py-3 px-4">聯絡電話</th>
                  <th className="py-3 px-4">地址資訊</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">加入日期</th>
                  <th className="py-3 px-4 text-center">填寫狀態</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {users
                  .filter(u => {
                    const searchLower = customerSearch.toLowerCase();
                    return (
                      (u.name || '').toLowerCase().includes(searchLower) ||
                      (u.storeName || '').toLowerCase().includes(searchLower) ||
                      (u.email || '').toLowerCase().includes(searchLower) ||
                      (u.phone || '').toLowerCase().includes(searchLower)
                    );
                  })
                  .map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {u.storeName || u.name || '無名會員'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-mono">{u.phone || '-'}</td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {u.billingAddress && (
                          <div>
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1 py-0.5 rounded mr-1">通訊</span>
                            {u.billingAddress}
                          </div>
                        )}
                        {u.shippingAddress && (
                          <div className="mt-1">
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1 py-0.5 rounded mr-1">送貨</span>
                            {u.shippingAddress}
                          </div>
                        )}
                        {!u.billingAddress && !u.shippingAddress && <span className="text-slate-400">尚未填寫</span>}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-xs">{u.email}</td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {u.createdAt ? format(new Date(u.createdAt), 'yyyy年MM月dd日') : '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {u.isProfileComplete ? (
                           <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                             資料完整
                           </span>
                        ) : (
                           <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                             資料未全
                           </span>
                        )}
                      </td>
                    </tr>
                  ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">目前沒有任何客戶資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: REPORTS */}
      {activeTab === 'reports' && (() => {
        const monthlyStats: Record<string, Record<string, number>> = {};
        const months = new Set<string>();

        orders.forEach(order => {
          if (order.status === 'cancelled') return;
          const month = format(new Date(order.createdAt), 'yyyy年MM月');
          months.add(month);
          if (!monthlyStats[month]) monthlyStats[month] = {};
          
          order.items.forEach((item: any) => {
            monthlyStats[month][item.name] = (monthlyStats[month][item.name] || 0) + item.quantity;
          });
        });

        const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));

        return (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <BarChart3 className="text-emerald-600 w-5 h-5" />
                  各月份商品銷售報表
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">系統自動加總已成立訂單，呈現各品項熱銷排名與月份趨勢。</p>
              </div>
            </div>
            {sortedMonths.length === 0 ? (
              <p className="text-slate-400 font-medium text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">目前尚未有任何完成或處理中的訂單資料，暫無報表。</p>
            ) : (
              <div className="space-y-8">
                {sortedMonths.map(month => (
                  <div key={month} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-800 text-sm">{month}度銷售排行</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">即時更新</span>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                            <th className="py-3 px-6 font-bold">商品品項名稱</th>
                            <th className="py-3 px-6 text-right font-bold">累計銷售總數</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-50">
                          {Object.entries(monthlyStats[month]).sort((a, b) => b[1] - a[1]).map(([productName, quantity], idx, arr) => (
                            <tr key={productName} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-6 font-bold text-slate-700">{productName}</td>
                              <td className="py-3.5 px-6 text-right font-black text-emerald-600 text-base">{quantity} 份</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600 w-5 h-5" />
              Google Sheets 同步與電子信件設定
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">設定您的專屬試算表 ID，成立新訂單時將全自動彙整同步並寄出 PDF 收據通知。</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">試算表唯一識別 ID (Spreadsheet ID)</label>
              <input 
                type="text" 
                disabled={isSavingSettings}
                className="w-full bg-slate-50 rounded-xl border-slate-200 shadow-sm border p-3.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50 font-mono" 
                placeholder="e.g. 1BxiMvs0X15uQaPq..."
                value={settings.spreadsheetId}
                onChange={e => setSettings({...settings, spreadsheetId: e.target.value})}
              />
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 mt-3 leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">💡 如何取得我的 Spreadsheet ID？</p>
                在您建立的 Google 試算表瀏覽器網址列中，選取並複製兩斜線之間的那串長代碼（例如：https://docs.google.com/spreadsheets/d/<span className="font-bold text-emerald-600 bg-emerald-50 px-1">您的_ID_就在這裡</span>/edit）。
                請確保該試算表的工作表名稱確實包含一個叫作「<span className="font-bold text-slate-700">Orders</span>」的分頁。
              </div>
            </div>
            
            <button 
              onClick={saveSettings} 
              disabled={isSavingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  正在儲存設定...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  儲存同步設定
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB: INTEGRATIONS (Recommended Software Plugins & GitHub Templates) */}
      {activeTab === 'integrations' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Top Recommendation Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-emerald-600/15">
            <h2 className="text-xl md:text-2xl font-black mb-2 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-emerald-200 animate-spin-slow" />
              外掛軟體與系統升級整合中心
            </h2>
            <p className="text-xs md:text-sm text-emerald-100 max-w-3xl leading-relaxed">
              為了打造全台灣最穩定、防呆的訂單系統，我們為您設計了以下外掛軟體模組。
              您可以直接啟用並輸入金鑰，系統將全自動串接或生成即時模擬，為您的滷味、餐飲事業保駕護航！
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ECPAY CARD */}
            <div className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between ${settings.ecpayEnabled ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs">ECPay</span>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">綠界科技金流外掛</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">信用卡 / 超商代碼 / ATM 轉帳</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.ecpayEnabled}
                      onChange={e => setSettings({...settings, ecpayEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  台灣最普及的第三方金流，提供買家在 7-11、全家等超商點選代碼繳費，或直接使用信用卡刷卡，支援結帳金額與繳費狀態全自動防呆對帳。
                </p>
                
                {settings.ecpayEnabled && (
                  <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">商店代號 (Merchant ID)</label>
                      <input 
                        type="text" 
                        placeholder="例如: 2000132"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                        value={settings.ecpayMerchantId}
                        onChange={e => setSettings({...settings, ecpayMerchantId: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">HashKey</label>
                        <input 
                          type="password" 
                          placeholder="ECPay HashKey"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                          value={settings.ecpayHashKey}
                          onChange={e => setSettings({...settings, ecpayHashKey: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">HashIV</label>
                        <input 
                          type="password" 
                          placeholder="ECPay HashIV"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                          value={settings.ecpayHashIv}
                          onChange={e => setSettings({...settings, ecpayHashIv: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 flex items-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>建議開立綠界個人或企業會員以取得 API 串接密鑰。</span>
              </div>
            </div>

            {/* LINE PAY CARD */}
            <div className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between ${settings.linepayEnabled ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs">LINE Pay</span>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">LINE Pay 支付外掛</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">LINE Points 點數折抵支付</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.linepayEnabled}
                      onChange={e => setSettings({...settings, linepayEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  串接全台用戶數最多的 LINE Pay，點選結帳後自動呼叫手機 LINE App 支付，支援 LINE Points 紅利即時折抵，能為您提升高達 30% 到 50% 的點單轉換率。
                </p>
                
                {settings.linepayEnabled && (
                  <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">LINE Pay Channel ID</label>
                      <input 
                        type="text" 
                        placeholder="輸入 LINE Pay 渠道 ID"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                        value={settings.linepayChannelId}
                        onChange={e => setSettings({...settings, linepayChannelId: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">LINE Pay Channel Secret</label>
                      <input 
                        type="password" 
                        placeholder="輸入 LINE Pay 渠道密鑰"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                        value={settings.linepaySecret}
                        onChange={e => setSettings({...settings, linepaySecret: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 flex items-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>需向 LINE Pay 官方註冊商戶申請，通過後方可串接至生產環境。</span>
              </div>
            </div>

            {/* LALAMOVE LOGISTICS CARD */}
            <div className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between ${settings.lalamoveEnabled ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-xs">LOGI</span>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">Lalamove 自動外送物流外掛</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">即時機車配送 / 自動派遣</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.lalamoveEnabled}
                      onChange={e => setSettings({...settings, lalamoveEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  當後台管理員點擊「訂單出貨完成」時，此模組會自動調用 Lalamove API 帶入顧客的外送地址，自動核算運費並在 10 秒內派遣最近的機車司機進行配送，大幅縮短人工打單派遣時間。
                </p>
                
                {settings.lalamoveEnabled && (
                  <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Lalamove API Key</label>
                      <input 
                        type="text" 
                        placeholder="輸入 Lalamove API 金鑰"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                        value={settings.lalamoveApiKey}
                        onChange={e => setSettings({...settings, lalamoveApiKey: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Lalamove Secret Key</label>
                      <input 
                        type="password" 
                        placeholder="輸入 Lalamove 私鑰"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                        value={settings.lalamoveApiSecret}
                        onChange={e => setSettings({...settings, lalamoveApiSecret: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 flex items-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>支援台灣各主要城市。整合完成後即可擺脫手動叫車，達成100%防呆自動物流。</span>
              </div>
            </div>

            {/* LINE NOTIFY NOTIFICATION CARD */}
            <div className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between ${settings.linenotifyEnabled ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-xs">NOTIFY</span>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">LINE Notify 自動通知外掛</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">免簡訊費 / 即時推播提醒</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.linenotifyEnabled}
                      onChange={e => setSettings({...settings, linenotifyEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  結帳或出貨狀態更新時，系統自動發送 LINE 通知到您自訂的商家群組，或者推播給買家。防呆不漏接，取代高昂的簡訊 (SMS) 費用，提供全台最迅速又免費的狀態通知。
                </p>
                
                {settings.linenotifyEnabled && (
                  <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">LINE Notify 權杖 (Access Token)</label>
                      <input 
                        type="password" 
                        placeholder="請輸入 LINE Notify 存取權杖"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                        value={settings.linenotifyToken}
                        onChange={e => setSettings({...settings, linenotifyToken: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 flex items-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>可登入 LINE Notify 官方個人頁面申請免費權杖，取得速度僅需 1 分鐘！</span>
              </div>
            </div>

          </div>

          {/* GitHub Templates & System Optimizations Guide Block */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8">
            <h3 className="font-black text-slate-800 text-base mb-2 flex items-center gap-2">
              <span className="p-1.5 bg-slate-800 text-white rounded-lg"><Package className="w-4 h-4" /></span>
              推薦套用之開源 GitHub 訂單與 POS 模版推薦
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              如果您未來想針對前台或是收銀介面進行更大規模的架構擴充，我們為您精選並審核了以下高防呆、高擴充性的頂級開源 GitHub 模組與技術指南：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  1. POS-System-React
                </h4>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  適合門市實體櫃檯與線上點餐系統（餐飲 POS）的完美結合。採用精緻的雙欄切換、購物車點單與發票暫存功能，程式結構與本系統完美相容，適合作為下一步櫃檯點餐擴展。
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  2. Tailwind-Ecommerce
                </h4>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  提供業界標準的電商前台模版。內建篩選器、多規格 (Variants) 選擇、以及極為精準的響應式側邊抽屜，可以完美導入本案的 Firebase 商品與庫存更新。
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    3. Firebase-Transactions-POS
                  </h4>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    詳細解說了在 Firebase 中如何撰寫強大的原子級交易「runTransaction」，避免兩人同時搶購最後一包貢丸時所產生的超賣，本案已成功吸取該模板核心安全邏輯！
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Centralized Save Button for Integrations */}
          <div className="flex justify-end pt-2">
            <button 
              onClick={saveSettings} 
              disabled={isSavingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  正在儲存外掛整合設定...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  儲存並啟用外掛整合設定
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
