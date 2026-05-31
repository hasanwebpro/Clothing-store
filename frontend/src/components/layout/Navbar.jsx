/**
 * Navbar — Floating glass top bar with smart hide-on-scroll.
 *
 * Behavior
 * --------
 * - Top of page: transparent over hero (lets the shader show through)
 * - After scrolling 60px: solid glass with backdrop blur and gold underline
 * - Scrolling DOWN past 200px: navbar slides up (out of view)
 * - Scrolling UP at any point: navbar slides back down
 *
 * Why this matters
 * - Maximises content area while reading
 * - Always one swipe-up away when the user wants it back
 * - Glass treatment keeps the navbar luxurious instead of "browser chrome"
 */
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import CartDrawer from '../cart/CartDrawer';

const NAV_LINKS = [
  { label: 'Women',       to: '/category/women' },
  { label: 'Men',         to: '/category/men' },
  { label: 'Kids',        to: '/category/kids' },
  { label: 'Accessories', to: '/category/accessories' },
  { label: 'Sale',        to: '/category/sale', hot: true },
  { label: 'New In',      to: '/products?ordering=-created_at' },
  { label: 'About',       to: '/about' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Smart show/hide on scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // Hide on scroll DOWN past 200px, show on scroll UP
      if (y > 200 && y > lastScrollY.current + 4) setHidden(true);
      else if (y < lastScrollY.current - 4) setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Whether we're on a route with a dark hero (Hero takes the navbar dark)
  const isHomeAtTop = location.pathname === '/' && !scrolled;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        {/* Gold luminous underline that fades in as you scroll */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.5), transparent)' }}
        />

        <div
          className={`transition-all duration-500 ${
            scrolled
              ? 'bg-white/85 backdrop-blur-xl backdrop-saturate-150 shadow-sm'
              : isHomeAtTop
              ? 'bg-transparent'
              : 'bg-white/70 backdrop-blur-md'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">

              {/* ── Logo ───────────────────────────────────────────── */}
              <Link to="/" className="flex-shrink-0 group">
                <span
                  className={`font-display text-2xl font-bold tracking-tight transition-colors ${
                    isHomeAtTop ? 'text-white' : 'text-ink-900'
                  }`}
                >
                  VOGUE
                  <span className="text-luxe-500 group-hover:text-shimmer-luxe transition-colors">.</span>
                </span>
              </Link>

              {/* ── Center: search ─────────────────────────────────── */}
              <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:flex">
                <div className="relative w-full">
                  <input
                    type="search"
                    placeholder="Search luxury fashion…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full rounded-full border py-2 pl-10 pr-4 text-sm transition-all duration-300 focus:outline-none focus:ring-2 ${
                      isHomeAtTop
                        ? 'bg-white/10 border-white/15 text-white placeholder-white/50 focus:bg-white/15 focus:ring-luxe-400/40'
                        : 'bg-white/60 border-neutral-200/80 text-ink-900 placeholder-neutral-400 focus:bg-white focus:ring-brand-400/40 focus:border-brand-300'
                    }`}
                  />
                  <button
                    type="submit"
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${isHomeAtTop ? 'text-white/60 hover:text-white' : 'text-neutral-400 hover:text-ink-900'} transition-colors`}
                    aria-label="Search"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* ── Right actions ─────────────────────────────────── */}
              <div className="flex items-center gap-1.5 sm:gap-3">

                {/* Wishlist (auth only) */}
                {isAuthenticated && (
                  <Link
                    to="/account/wishlist"
                    aria-label="Wishlist"
                    className={`hidden sm:flex w-10 h-10 items-center justify-center rounded-full transition-colors ${
                      isHomeAtTop ? 'text-white/80 hover:bg-white/10' : 'text-ink-700 hover:bg-neutral-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </Link>
                )}

                {/* Cart */}
                <button
                  onClick={() => setCartOpen(true)}
                  aria-label={`Open cart (${itemCount} items)`}
                  className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                    isHomeAtTop ? 'text-white hover:bg-white/10' : 'text-ink-900 hover:bg-neutral-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-luxe-500 text-[10px] font-bold text-white ring-2 ring-white shadow-md min-w-[18px] h-[18px] px-1">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </button>

                {/* Account / Auth */}
                {isAuthenticated ? (
                  <div className="relative group">
                    <button
                      className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-sm font-medium transition-colors ${
                        isHomeAtTop
                          ? 'text-white hover:bg-white/10'
                          : 'text-ink-700 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 via-brand-600 to-luxe-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/30 shadow-md">
                        {user?.first_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="hidden sm:block max-w-[80px] truncate">{user?.first_name}</span>
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-60 glass-card rounded-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="px-4 py-3 border-b border-neutral-100/80">
                        <p className="text-[10px] text-luxe-600 uppercase tracking-widest font-bold">Signed in as</p>
                        <p className="text-sm font-semibold text-ink-900 truncate mt-0.5">{user?.email}</p>
                      </div>
                      {user?.role === 'admin' && (
                        <Link to="/admin/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-brand-50/60 hover:text-brand-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Admin Panel
                        </Link>
                      )}
                      {user?.role === 'seller' && (
                        <Link to="/seller/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-brand-50/60 hover:text-brand-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Seller Panel
                        </Link>
                      )}
                      <Link to="/account/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-neutral-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        My Orders
                      </Link>
                      <Link to="/account/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-neutral-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Wishlist
                      </Link>
                      <Link to="/account/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-neutral-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>
                      <div className="mx-3 my-1 h-px bg-neutral-100" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className={`hidden sm:block text-sm font-medium transition-colors ${
                        isHomeAtTop ? 'text-white/85 hover:text-white' : 'text-ink-700 hover:text-ink-900'
                      }`}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      className={`text-sm font-semibold rounded-full px-5 py-2 transition-all duration-300 ${
                        isHomeAtTop
                          ? 'bg-white text-ink-900 hover:bg-luxe-100'
                          : 'bg-ink-900 text-white hover:bg-ink-800 shadow-md hover:shadow-luxe'
                      }`}
                    >
                      Join Now
                    </Link>
                  </div>
                )}

                {/* Mobile hamburger */}
                <button
                  className={`md:hidden w-10 h-10 flex items-center justify-center rounded-full ${
                    isHomeAtTop ? 'text-white' : 'text-ink-900'
                  }`}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Sub-nav links (desktop only) ─────────────────────── */}
            <nav className="hidden md:flex items-center gap-7 pb-3 -mt-1" aria-label="Main navigation">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`relative text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                    isHomeAtTop ? 'text-white/80 hover:text-white' : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {item.label}
                  {item.hot && (
                    <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow">HOT</span>
                  )}
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-brand-500 to-luxe-500 scale-x-0 hover:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* ── Mobile menu drawer ───────────────────────────────────── */}
        {menuOpen && (
          <div className="md:hidden glass-light border-t border-neutral-100/80 animate-fade-in-down">
            <div className="px-4 py-4 space-y-1">
              <form onSubmit={handleSearch} className="mb-3">
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-ink-700 hover:bg-neutral-50"
                >
                  {item.label}
                  {item.hot && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HOT</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Spacer — keep page content below the fixed navbar */}
      {!isHomeAtTop && <div className="h-16" aria-hidden="true" />}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
