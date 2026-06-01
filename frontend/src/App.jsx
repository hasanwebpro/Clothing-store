import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import SellerLayout from './components/layout/SellerLayout';
import AccountLayout from './components/layout/AccountLayout';
import ProtectedRoute from './router/ProtectedRoute';
import RoleRoute from './router/RoleRoute';

// ── Lazy-loaded pages (only downloaded when visited) ─────────────────────────
const HomePage            = lazy(() => import('./pages/public/HomePage'));
const ProductListPage     = lazy(() => import('./pages/public/ProductListPage'));
const ProductDetailPage   = lazy(() => import('./pages/public/ProductDetailPage'));
const CategoryPage        = lazy(() => import('./pages/public/CategoryPage'));
const SearchPage          = lazy(() => import('./pages/public/SearchPage'));
const AboutPage           = lazy(() => import('./pages/public/AboutPage'));
const FeaturesPage        = lazy(() => import('./pages/public/FeaturesPage'));

const LoginPage           = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage        = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AdminLoginPage      = lazy(() => import('./pages/admin/AdminLoginPage'));

const CartPage            = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage        = lazy(() => import('./pages/customer/CheckoutPage'));
const OrderSuccessPage    = lazy(() => import('./pages/customer/OrderSuccessPage'));
const OrdersPage          = lazy(() => import('./pages/customer/account/OrdersPage'));
const OrderDetailPage     = lazy(() => import('./pages/customer/account/OrderDetailPage'));
const WishlistPage        = lazy(() => import('./pages/customer/account/WishlistPage'));
const AccountSettingsPage = lazy(() => import('./pages/customer/account/AccountSettingsPage'));

const SellerDashboardPage = lazy(() => import('./pages/seller/SellerDashboardPage'));
const SellerProductsPage  = lazy(() => import('./pages/seller/SellerProductsPage'));
const ProductFormPage     = lazy(() => import('./pages/seller/ProductFormPage'));
const InventoryPage       = lazy(() => import('./pages/seller/InventoryPage'));

const AdminDashboardPage  = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminOrdersPage     = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminUsersPage      = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminProductsPage   = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminCouponsPage    = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminProductFormPage = lazy(() => import('./pages/admin/AdminProductFormPage'));

// ── Minimal page spinner ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

// ── Defer WebGL cursor until after first paint ────────────────────────────────
function DeferredCursor() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestIdleCallback
      ? requestIdleCallback(() => setShow(true), { timeout: 2000 })
      : setTimeout(() => setShow(true), 500);
    return () => (requestIdleCallback ? cancelIdleCallback(id) : clearTimeout(id));
  }, []);
  if (!show) return null;
  const FluidCursor = lazy(() => import('./components/effects/FluidCursor'));
  return (
    <Suspense fallback={null}>
      <FluidCursor />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DeferredCursor />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Auth routes ── */}
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/login"    element={<AdminLoginPage />} />

          {/* ── Public routes ── */}
          <Route element={<PublicLayout />}>
            <Route path="/"              element={<HomePage />} />
            <Route path="/products"      element={<ProductListPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/search"        element={<SearchPage />} />
            <Route path="/about"         element={<AboutPage />} />
            <Route path="/features"      element={<FeaturesPage />} />
          </Route>

          {/* ── Customer routes ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/cart"             element={<CartPage />} />
              <Route path="/checkout"         element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<OrderSuccessPage />} />
            </Route>
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<Navigate to="orders" replace />} />
              <Route path="orders"                element={<OrdersPage />} />
              <Route path="orders/:orderNumber"   element={<OrderDetailPage />} />
              <Route path="wishlist"              element={<WishlistPage />} />
              <Route path="settings"             element={<AccountSettingsPage />} />
            </Route>
          </Route>

          {/* ── Seller routes ── */}
          <Route element={<RoleRoute roles={['seller', 'admin']} />}>
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"        element={<SellerDashboardPage />} />
              <Route path="products"         element={<SellerProductsPage />} />
              <Route path="products/new"     element={<ProductFormPage />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />
              <Route path="inventory"        element={<InventoryPage />} />
            </Route>
          </Route>

          {/* ── Admin routes ── */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"         element={<AdminDashboardPage />} />
              <Route path="orders"            element={<AdminOrdersPage />} />
              <Route path="users"             element={<AdminUsersPage />} />
              <Route path="products"          element={<AdminProductsPage />} />
              <Route path="products/new"      element={<AdminProductFormPage />} />
              <Route path="products/:id/edit" element={<AdminProductFormPage />} />
              <Route path="coupons"           element={<AdminCouponsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
