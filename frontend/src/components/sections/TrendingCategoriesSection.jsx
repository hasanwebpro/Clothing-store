import { Link } from 'react-router-dom';
import { useRevealClass } from '../../hooks/useScrollReveal';

const CATEGORIES = [
  { name: "Women's Fashion", slug: 'women',       desc: 'Dresses, Tops & More',         image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&auto=format&fit=crop', badge: 'Trending',  badgeColor: 'bg-rose-500' },
  { name: "Men's Fashion",   slug: 'men',         desc: 'Shirts, Trousers & Casuals',    image: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&q=80&auto=format&fit=crop', badge: 'New In',    badgeColor: 'bg-blue-500' },
  { name: "Kids' Wear",      slug: 'kids',        desc: 'Cute Styles for Little Ones',   image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80&auto=format&fit=crop', badge: 'Popular',   badgeColor: 'bg-amber-500' },
  { name: 'Accessories',     slug: 'accessories', desc: 'Bags, Jewellery & More',        image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80&auto=format&fit=crop', badge: 'Must Have', badgeColor: 'bg-emerald-500' },
  { name: 'Summer Sale',     slug: 'sale',        desc: 'Up to 60% Off Selected Styles', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80&auto=format&fit=crop', badge: '60% Off',   badgeColor: 'bg-red-500' },
  { name: 'New Arrivals',    slug: '',            desc: 'Fresh Styles Every Week',        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop', badge: 'Just In',   badgeColor: 'bg-violet-500', link: '/products?ordering=-created_at' },
];

function CategoryCard({ cat, delay }) {
  const { ref, className } = useRevealClass();
  const href = cat.link || `/category/${cat.slug}`;
  return (
    <Link ref={ref} to={href}
      className={`${className} group relative overflow-hidden rounded-2xl aspect-[4/3] block hover:shadow-2xl transition-all duration-400 hover:-translate-y-1 cursor-pointer`}
      style={{ transitionDelay: `${delay}ms` }}>
      <img src={cat.image} alt={cat.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className={`absolute top-4 left-4 ${cat.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg`}>{cat.badge}</span>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-display font-bold text-white text-lg leading-tight">{cat.name}</h3>
        <p className="text-sm text-white/70 mt-0.5">{cat.desc}</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 mt-2 group-hover:gap-2.5 transition-all duration-200">
          Shop now
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </span>
      </div>
    </Link>
  );
}

export default function TrendingCategoriesSection() {
  const { ref, className } = useRevealClass();
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div ref={ref} className={`${className} text-center mb-12`}>
        <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Browse By Category</span>
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mt-2" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.45))' }}>Trending Right Now</h2>
        <p className="text-neutral-500 mt-3 max-w-lg mx-auto">From everyday essentials to statement pieces — find your style.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
        {CATEGORIES.map((cat, i) => <CategoryCard key={cat.slug + cat.name} cat={cat} delay={i * 80} />)}
      </div>
    </section>
  );
}
