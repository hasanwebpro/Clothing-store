import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  {
    to: '/seller/dashboard', label: 'Dashboard',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    to: '/seller/products', label: 'Products',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  },
  {
    to: '/seller/inventory', label: 'Inventory',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
  },
];

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Seller';

  return (
    <div className="flex min-h-screen" style={{ background: '#0c0118' }}>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-60
          transition-transform duration-300 admin-scroll overflow-y-auto
          lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'linear-gradient(180deg, #0c0118 0%, #120220 60%, #0c0118 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
        }}
      >
        <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(255,0,110,0.10) 0%, transparent 70%)' }} />

        {/* Brand */}
        <div className="relative px-5 pt-6 pb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ff006e 0%, #ff75bb 50%, #a21caf 100%)', boxShadow: '0 4px 16px rgba(255,0,110,0.35)' }}>
              <span className="text-white font-bold text-sm font-display">V</span>
            </div>
            <div>
              <p className="text-white font-display text-lg font-semibold leading-none">VOGUE</p>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mt-0.5" style={{ color: 'rgba(255,0,110,0.7)' }}>
                Seller Panel
              </p>
            </div>
          </div>
          <div className="mt-5 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,0,110,0.3), transparent)' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 mb-2 text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Navigation</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
              style={({ isActive }) => isActive ? {
                background: 'rgba(255,0,110,0.09)', border: '1px solid rgba(255,0,110,0.16)',
                boxShadow: '0 0 20px rgba(255,0,110,0.08)', color: '#ff75bb',
              } : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] rounded-r-full"
                      style={{ background: 'linear-gradient(180deg,#ff006e,#ff75bb)', boxShadow: '0 0 8px rgba(255,0,110,.6)' }} />
                  )}
                  <span className={`flex-shrink-0 ${isActive ? '' : 'opacity-40'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 pb-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ff006e, #ff75bb)' }}>
              {user?.first_name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-white/80">{user?.first_name}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,0,110,0.6)' }}>Seller</p>
            </div>
          </div>
          <NavLink to="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors mb-1"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Store
          </NavLink>
          <button onClick={() => logout().then(() => navigate('/'))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors"
            style={{ color: 'rgba(239,68,68,0.55)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 flex-shrink-0"
          style={{ background: 'rgba(13,13,20,0.88)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 1px 0 rgba(255,0,110,0.08)' }}>
          <button onClick={() => setMobileOpen(v => !v)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,0,110,0.5)' }}>Seller</span>
            <svg className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{pageTitle}</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #ff006e, #ff75bb)', boxShadow: '0 0 12px rgba(255,0,110,0.3)' }}>
            {user?.first_name?.[0]?.toUpperCase()}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 admin-scroll overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
