/**
 * FeaturesPage — Platform feature showcase.
 *
 * Business Goal: Reduce churn from users who abandoned checkout due to
 * feature confusion. This page answers all "Can I...?" questions before
 * they become objections.
 *
 * SEO: Targets comparison keywords: "best online clothing store Pakistan",
 * "COD clothing delivery Pakistan", "JazzCash fashion store".
 */
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { useRevealClass } from '../../hooks/useScrollReveal';

// SVG icon components — consistent w-6 h-6 in a 48px container
const Icons = {
  Search: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Ruler: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Cash: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Box: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Truck: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  Gift: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  Return: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  List: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Lightning: () => (
    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

const PATTERN_ICONS = {
  Singleton: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Repository: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  Factory: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  Builder: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Observer: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Strategy: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Adapter: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  ),
  Decorator: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  MVC: () => (
    <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
};

const FEATURES = [
  {
    category: 'Shopping Experience',
    items: [
      { Icon: Icons.Search, title: 'Smart Search & Filters', desc: 'Find exactly what you want with powerful search — filter by size, color, price, brand, category, and more. Results update in real-time.', tech: 'Full-text search powered by MySQL FULLTEXT index + Django Filter' },
      { Icon: Icons.Ruler, title: 'Detailed Size Guide', desc: 'Every product has measurements in centimeters. Our size guide recommends your size based on your measurements — no more guessing.', tech: 'Product variant attributes linked to size charts' },
      { Icon: Icons.Camera, title: 'Multi-Image Gallery', desc: 'View products from every angle with multi-image galleries. Zoom in on fabric texture, stitching, and fine details.', tech: 'Lazy-loaded images with Intersection Observer API' },
      { Icon: Icons.Heart, title: 'Wishlist', desc: "Save items you love for later. Your wishlist syncs to your account and is accessible from any device. We notify you if a wishlisted item goes on sale.", tech: 'Wishlist table with Observer pattern for sale notifications' },
    ],
  },
  {
    category: 'Checkout & Payments',
    items: [
      { Icon: Icons.Cash, title: 'Cash on Delivery (COD)', desc: 'Pay when your order arrives. COD is available across Pakistan with no extra fee. The safest payment option for first-time shoppers.', tech: 'CODStrategy — Strategy Pattern in PaymentService' },
      { Icon: Icons.Phone, title: 'Easypaisa', desc: 'Pay instantly with your mobile wallet. One-tap payment for registered Easypaisa users. No card needed.', tech: 'Adapter Pattern wraps Easypaisa SDK into PaymentStrategy interface' },
      { Icon: Icons.Tag, title: 'Coupon Codes', desc: 'Apply discount codes at checkout. Coupons support percentage discounts, fixed amounts, minimum order values, and expiry dates.', tech: 'Decorator Pattern: CouponDecorator wraps PriceCalculator' },
      { Icon: Icons.Box, title: '3-Step Checkout', desc: 'Our streamlined 3-step checkout (Address → Payment → Review) reduces cart abandonment. All saved addresses are pre-loaded.', tech: 'React multi-step form with CartContext state' },
    ],
  },
  {
    category: 'Delivery & Returns',
    items: [
      { Icon: Icons.Truck, title: 'Fast Nationwide Delivery', desc: '2–5 day delivery across Pakistan. Major cities receive orders in 2–3 days. Real-time tracking via SMS.', tech: 'Order status Observer fires SMS notification on dispatch' },
      { Icon: Icons.Gift, title: 'Free Delivery', desc: 'Free standard delivery on all orders over PKR 2,000. The threshold is calculated automatically at checkout — no code needed.', tech: 'Shipping cost calculated in CartPriceCalculator (Decorator)' },
      { Icon: Icons.Return, title: '30-Day Free Returns', desc: 'Change your mind? Return it free within 30 days. Wrong size? Exchange it free. We handle the pickup — you just pack it.', tech: 'Return request flow via Order management system' },
      { Icon: Icons.MapPin, title: 'Live Order Tracking', desc: 'Track your order status in real-time from your account dashboard. Get notified via SMS at every stage — Confirmed, Shipped, Delivered.', tech: 'Order status timeline with EventBus Observer notifications' },
    ],
  },
  {
    category: 'Account & Personalization',
    items: [
      { Icon: Icons.User, title: 'Secure Account', desc: 'Protected with JWT authentication and bcrypt password hashing. Access tokens expire in 15 minutes for maximum security.', tech: 'JWT (djangorestframework-simplejwt), access token in memory (XSS protection)' },
      { Icon: Icons.List, title: 'Order History', desc: 'All your orders in one place. View itemized receipts, track current orders, and reorder previous purchases in one click.', tech: 'OrderRepository pattern for efficient DB queries' },
      { Icon: Icons.Bell, title: 'Smart Notifications', desc: 'Get notified when your order ships, when a wishlisted item goes on sale, or when items come back in stock. In-app plus email.', tech: 'EventBus Observer: OrderObserver, InventoryObserver, EmailObserver' },
      { Icon: Icons.Lightning, title: 'Personalized Recommendations', desc: 'See products matched to your browsing and purchase history. The more you shop, the smarter the recommendations get.', tech: 'Collaborative filtering via analytics endpoint' },
    ],
  },
];

const PATTERNS = [
  { key: 'Singleton', pattern: 'Singleton', where: 'Database connection manager' },
  { key: 'Repository', pattern: 'Repository', where: 'Data access abstraction layer' },
  { key: 'Factory', pattern: 'Factory', where: 'Product & component creation' },
  { key: 'Builder', pattern: 'Builder', where: 'Complex product construction' },
  { key: 'Observer', pattern: 'Observer', where: 'Real-time cart & notifications' },
  { key: 'Strategy', pattern: 'Strategy', where: 'Payment method switching' },
  { key: 'Adapter', pattern: 'Adapter', where: 'Easypaisa & Card APIs' },
  { key: 'Decorator', pattern: 'Decorator', where: 'Stackable price discounts' },
  { key: 'MVC', pattern: 'MVC / SoC', where: 'Overall system architecture' },
];

function FeatureItem({ item, delay }) {
  const { ref, className } = useRevealClass();
  const { Icon } = item;
  return (
    <div ref={ref} className={`${className} flex gap-4`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
        <Icon />
      </div>
      <div>
        <h3 className="font-semibold text-neutral-900">{item.title}</h3>
        <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{item.desc}</p>
        <p className="text-xs text-neutral-400 mt-1.5 font-mono bg-neutral-50 rounded px-2 py-0.5 inline-block">
          Tech: {item.tech}
        </p>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  useSEO({
    title: 'Features',
    description: "Discover everything VOGUE offers — smart search, COD & Easypaisa payments, free returns, live tracking, wishlist, and personalized recommendations. Pakistan's most feature-rich clothing store.",
  });

  const { ref, className } = useRevealClass();

  return (
    <div>
      {/* Hero */}
      <section className="text-white py-24 text-center overflow-hidden relative" style={{ background:'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Platform Features</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-3 animate-fade-in-up tracking-tight" style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 28px rgba(255,100,160,0.6))' }}>
            Everything You Need,<br />All In One Place
          </h1>
          <p className="text-white/85 mt-5 text-lg animate-fade-in-up delay-200">
            From smart shopping tools to secure payments and hassle-free returns — VOGUE is built around your experience.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-full mt-8 transition-all hover:scale-105 animate-fade-in-up delay-300"
          >
            Start Shopping
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Feature sections */}
      {FEATURES.map((section, si) => (
        <section key={section.category} className={`py-16 ${si % 2 === 1 ? 'bg-neutral-50' : ''}`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>{section.category}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {section.items.map((item, i) => (
                <FeatureItem key={item.title} item={item} delay={i * 100} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Design patterns explainer */}
      <section className="py-20 bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={ref} className={`${className} text-center mb-12`}>
            <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Engineering Excellence</span>
            <h2 className="font-display text-3xl font-bold text-white mt-2">Built on Solid Architecture</h2>
            <p className="text-neutral-400 mt-3">
              VOGUE is engineered with industry-standard software design patterns for maintainability, scalability, and extensibility.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PATTERNS.map((p) => {
              const PatternIcon = PATTERN_ICONS[p.key];
              return (
                <div key={p.pattern} className="glass-dark rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    {PatternIcon && <PatternIcon />}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{p.pattern} Pattern</p>
                    <p className="text-xs text-neutral-400">{p.where}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>
            See All Features in Action
          </h2>
          <p className="text-neutral-500 mt-3">
            Create a free account and experience VOGUE's full feature set.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link to="/register" className="btn-primary px-8 py-3.5">Create Free Account</Link>
            <Link to="/products" className="btn-secondary px-8 py-3.5">Browse Products</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
