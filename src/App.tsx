import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Storefront from './pages/Storefront';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminMembers from './pages/admin/Members';
import AdminSystem from './pages/admin/System';
import SiteManager from './pages/admin/SiteManager';
import AdminReports from './pages/admin/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Storefront />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<Orders />} />
        </Route>
        <Route path="/admin" element={<Layout adminMode />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="site" element={<SiteManager />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="system" element={<AdminSystem />} />
            <Route path="settings" element={<Navigate to="/admin/system" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
