import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoadingPage from './components/ui/LoadingPage';
import PublicLayout from './components/layout/PublicLayout';

// Scrolls to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import AdminLayout from './components/layout/AdminLayout';
import SellerLayout from './components/layout/SellerLayout';
import AccountLayout from './components/layout/AccountLayout';
import ProtectedRoute from './router/ProtectedRoute';
import RoleRoute from './router/RoleRoute';
import FluidCursor from './components/effects/FluidCursor';

// Public pages
import HomePage from './pages/public/HomePage';
import ProductListPage from './pages/public/ProductListPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CategoryPage from './pages/public/CategoryPage';
import SearchPage from './pages/public/SearchPage';
import AboutPage from './pages/public/AboutPage';
import FeaturesPage from './pages/public/FeaturesPage';
import LoginPage from './pages/auth/LoginPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Customer pages
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import OrdersPage from './pages/customer/account/OrdersPage';
import OrderDetailPage from './pages/customer/account/OrderDetailPage';
import ReturnsPage from './pages/customer/account/ReturnsPage';
import WishlistPage from './pages/customer/account/WishlistPage';
import AddressesPage from './pages/customer/account/AddressesPage';
import AccountSettingsPage from './pages/customer/account/AccountSettingsPage';
import ContactPage from './pages/public/ContactPage';

// Seller pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerProductsPage from './pages/seller/SellerProductsPage';
import ProductFormPage from './pages/seller/ProductFormPage';
import InventoryPage from './pages/seller/InventoryPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminProductFormPage from './pages/admin/AdminProductFormPage';

// Splash runs once ever per browser — never again after first view
const SPLASH_MIN_MS = 2800;
const SPLASH_KEY    = 'vogue_splash_seen';

export default function App() {
  const { isLoading } = useAuth();
  const mountTime = useRef(Date.now());
  const alreadySeen = localStorage.getItem(SPLASH_KEY) === '1';
  const [showSplash, setShowSplash] = useState(!alreadySeen);

  useEffect(() => {
    if (alreadySeen) return;        // already seen — nothing to do
    if (isLoading) return;          // auth still in flight — keep waiting
    const elapsed   = Date.now() - mountTime.current;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
    const t = setTimeout(() => {
      localStorage.setItem(SPLASH_KEY, '1'); // mark as seen forever
      setShowSplash(false);
    }, remaining);
    return () => clearTimeout(t);
  }, [isLoading]);

  return (
    <BrowserRouter>
      {showSplash && <LoadingPage />}
      <ScrollToTop />
      <FluidCursor />
      <Routes>
        {/* ── Auth routes (full-screen, no navbar/footer) ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ── Public routes ── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* ── Customer routes (requires login) ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PublicLayout />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<OrderSuccessPage />} />
          </Route>
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderNumber" element={<OrderDetailPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* ── Seller routes ── */}
        <Route element={<RoleRoute roles={['seller', 'admin']} />}>
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SellerDashboardPage />} />
            <Route path="products" element={<SellerProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="inventory" element={<InventoryPage />} />
          </Route>
        </Route>

        {/* ── Admin routes ── */}
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage />} />
            <Route path="products/:id/edit" element={<AdminProductFormPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
