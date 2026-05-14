import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type React from 'react';
import { AppShell } from './components/Layout';
import { useAuthStore } from './lib/auth';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CustomerDetailPage, CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { OrderDetailPage, OrdersPage } from './pages/OrdersPage';
import { ProductDetailPage, ProductsPage } from './pages/ProductsPage';
import { RemindersPage } from './pages/RemindersPage';
import { UsersPage } from './pages/UsersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<NewOrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route
          path="/users"
          element={
            <RequireSuperAdmin>
              <UsersPage />
            </RequireSuperAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
