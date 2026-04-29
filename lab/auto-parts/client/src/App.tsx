import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/Login';
import ProductsPage from './pages/Products';
import StockPage from './pages/Stock';
import CustomersPage from './pages/Customers';
import SalesPage from './pages/Sales';
import OrdersPage from './pages/Orders';
import ReceiptsPage from './pages/Receipts';
import ReorderPage from './pages/Reorder';
import ReportsPage from './pages/Reports';
import UsersPage from './pages/Users';
import AuditLogPage from './pages/AuditLog';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, isAdmin } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/sales" replace />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route
            path="receipts"
            element={
              <PrivateRoute adminOnly>
                <ReceiptsPage />
              </PrivateRoute>
            }
          />
          <Route path="reorder" element={<ReorderPage />} />
          <Route
            path="reports"
            element={
              <PrivateRoute adminOnly>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="users"
            element={
              <PrivateRoute adminOnly>
                <UsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="audit"
            element={
              <PrivateRoute adminOnly>
                <AuditLogPage />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
