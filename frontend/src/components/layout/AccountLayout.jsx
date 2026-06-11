import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/account/orders', label: 'My Orders' },
  { to: '/account/returns', label: 'Returns & Refunds' },
  { to: '/account/wishlist', label: 'Wishlist' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/settings', label: 'Account Settings' },
];

export default function AccountLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
