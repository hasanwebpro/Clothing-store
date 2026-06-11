/**
 * Footer — Complete site footer.
 *
 * Business Goal: The footer is the "last resort" for undecided users.
 * Good footer design prevents exits by surfacing important pages
 * (return policy, size guide, contact) that address final objections.
 *
 * SEO Value: Footer links provide internal link equity to key pages.
 * Sitemap-like structure helps Google crawl and index all pages.
 *
 * Conversion Elements:
 *  - Newsletter micro-form (last chance capture)
 *  - Trust badges (payment methods, security)
 *  - Social proof (customer count, delivery stat)
 *
 * Accessibility: Semantic <footer>, <nav> with aria-labels, and
 * link text is descriptive (not "click here").
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { newsletterApi } from '../../api/newsletter.api';
import toast from 'react-hot-toast';

const LINKS = [
  {
    title: 'Shop',
    links: [
      { label: "Women's Fashion", to: '/category/women' },
      { label: "Men's Fashion", to: '/category/men' },
      { label: "Kids' Wear", to: '/category/kids' },
      { label: 'Accessories', to: '/category/accessories' },
      { label: 'Sale', to: '/category/sale' },
      { label: 'New Arrivals', to: '/products?ordering=-created_at' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My Orders', to: '/account/orders' },
      { label: 'Wishlist', to: '/account/wishlist' },
      { label: 'Account Settings', to: '/account/settings' },
      { label: 'Sign In', to: '/login' },
      { label: 'Create Account', to: '/register' },
    ],
  },
  {
    title: 'Help & Info',
    links: [
      { label: 'About VOGUE', to: '/about' },
      { label: 'Features', to: '/features' },
      { label: 'Shipping Policy', to: '#' },
      { label: 'Returns & Exchanges', to: '/account/returns' },
      { label: 'Size Guide', to: '#' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'FAQ', to: '/#faq' },
    ],
  },
];

const SOCIAL = [
  { label: 'Instagram', href: '#', icon: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )},
  { label: 'Facebook', href: '#', icon: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
  { label: 'WhatsApp', href: 'https://wa.me/923001234567', icon: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )},
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      await newsletterApi.subscribe(email);
      setSubscribed(true);
      toast.success('Subscribed! Check your inbox for your discount code.');
    } catch {
      toast.error('Could not subscribe. Try again.');
    }
  };

  return (
    <footer className="bg-neutral-950 text-neutral-300" role="contentinfo">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link to="/" aria-label="VOGUE homepage">
              <span className="font-display text-2xl font-bold text-white">
                VOGUE<span className="text-brand-500">.</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed max-w-xs">
              Premium fashion for every occasion. Shop the latest trends from top brands with free delivery on orders over PKR 2,000.
            </p>

            {/* Newsletter mini-form */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Get 15% Off Your First Order</p>
              {subscribed ? (
                <p className="text-xs text-green-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Subscribed! Check your inbox.
              </p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email for newsletter"
                  />
                  <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
                    Join
                  </button>
                </form>
              )}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={`Follow us on ${s.label}`}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/15 transition-all"
                  rel="noopener noreferrer"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {LINKS.map((col) => (
            <nav key={col.title} aria-label={`${col.title} links`}>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Legal */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-neutral-500">
              <p>© {new Date().getFullYear()} VOGUE Fashion. All rights reserved.</p>
              <div className="flex gap-4">
                <Link to="#" className="hover:text-neutral-300 transition-colors">Privacy Policy</Link>
                <Link to="#" className="hover:text-neutral-300 transition-colors">Terms of Service</Link>
                <Link to="#" className="hover:text-neutral-300 transition-colors">Cookie Policy</Link>
              </div>
            </div>

            {/* Payment badges */}
            <div className="flex items-center gap-2">
              {['JazzCash', 'Easypaisa', 'COD', 'SSL Secure'].map((b) => (
                <span key={b} className="bg-white/5 border border-white/10 text-neutral-400 text-xs px-2.5 py-1 rounded-md">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Made in Pakistan */}
          <p className="text-center text-xs text-neutral-700 mt-6">
            Made with care in Pakistan — Serving customers nationwide
          </p>
        </div>
      </div>
    </footer>
  );
}
