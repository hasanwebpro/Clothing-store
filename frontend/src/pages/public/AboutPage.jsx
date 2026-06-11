/**
 * AboutPage — Brand story and identity.
 *
 * Business Goal: 22% of visitors check the About page before their first purchase.
 * A compelling story builds emotional connection and trust, especially for
 * a new brand competing against established stores.
 *
 * Conversion Strategy:
 *  - Story-first approach: make the brand human, not corporate
 *  - Team section: real people = real accountability = trust
 *  - Mission/Values: align with customer values (Pakistani fashion pride)
 *  - Closing CTA drives back to products
 *
 * SEO: Targets brand queries like "VOGUE fashion Pakistan story",
 * "authentic Pakistani clothing store", and builds topical authority.
 */
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { useRevealClass } from '../../hooks/useScrollReveal';

const VALUES = [
  {
    icon: (
      <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    title: 'Made for Pakistan',
    desc: 'We understand Pakistani fashion — the cultural sensibilities, the climate, the budget. Every product is selected with the Pakistani customer in mind.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Uncompromising Quality',
    desc: "Every item on VOGUE passes a strict quality inspection. We'd rather list fewer products than fill our store with low-quality merchandise.",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Customer First',
    desc: 'Free returns, 24/7 support, COD everywhere. We remove every friction between you and the perfect outfit.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Sustainable Choices',
    desc: 'We partner with manufacturers who follow ethical labour practices and are progressively shifting to sustainable packaging.',
  },
];

const MILESTONES = [
  { year: '2022', event: 'VOGUE founded in Lahore with 50 products' },
  { year: '2023', event: 'Reached 1,000 happy customers. Expanded to Karachi & Islamabad.' },
  { year: '2024', event: 'Launched Easypaisa payments. 10,000+ customers.' },
  { year: '2025', event: 'New platform launch with Seller Portal and 15,000+ products.' },
];

const TEAM = [
  { name: 'Syed Hassan Bukhari', role: 'Founder & CEO', initial: 'SHB', color: 'from-brand-400 to-purple-600' },
  { name: 'Muhammad Ahmed', role: 'Co-Founder & Head of Operations', initial: 'MA', color: 'from-blue-400 to-indigo-600' },
  { name: 'Huzaifa Ali Khan', role: 'Head of Technology', initial: 'HAK', color: 'from-emerald-400 to-teal-600' },
];

function ValueCard({ value, delay }) {
  const { ref, className } = useRevealClass();
  return (
    <div ref={ref} className={`${className} card p-6 space-y-3`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center">
        {value.icon}
      </div>
      <h3 className="font-display font-bold text-lg" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>{value.title}</h3>
      <p className="text-sm text-neutral-600 leading-relaxed">{value.desc}</p>
    </div>
  );
}

export default function AboutPage() {
  useSEO({
    title: 'About Us',
    description: 'Learn about VOGUE — Pakistan\'s premium online clothing store. Our story, mission, values, and the team behind the brand.',
  });

  const heroReveal = useRevealClass();
  const missionReveal = useRevealClass();
  const milestonesReveal = useRevealClass();
  const teamReveal = useRevealClass();

  return (
    <div>
      {/* Hero */}
      <section className="relative text-white py-24 md:py-36 overflow-hidden" style={{ background:'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Our Story</span>
          <h1 className="font-display text-4xl md:text-6xl font-bold mt-3 animate-fade-in-up tracking-tight" style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 28px rgba(255,100,160,0.6))' }}>
            Fashion That Feels Like Home
          </h1>
          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            VOGUE was born from a simple idea: Pakistani shoppers deserve a premium online fashion experience that truly understands their style, budget, and culture.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div ref={missionReveal.ref} className={`${missionReveal.className} grid md:grid-cols-2 gap-12 items-center`}>
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Our Mission</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 leading-tight" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>
              Dressing Pakistan, One Outfit at a Time
            </h2>
            <p className="text-neutral-600 mt-4 leading-relaxed">
              We started VOGUE because we were tired of settling. Tired of poor-quality clothing, unreliable delivery, and stores that didn't understand the Pakistani fashion sensibility.
            </p>
            <p className="text-neutral-600 mt-3 leading-relaxed">
              Today, we're proud to serve over 10,000 customers across Pakistan — from Karachi to Gilgit — delivering premium fashion at prices that make sense.
            </p>
            <div className="flex items-center gap-8 mt-8">
              <div>
                <p className="font-display text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>10k+</p>
                <p className="text-sm text-neutral-500">Happy Customers</p>
              </div>
              <div>
                <p className="font-display text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>500+</p>
                <p className="text-sm text-neutral-500">Premium Brands</p>
              </div>
              <div>
                <p className="font-display text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>4.9/5</p>
                <p className="text-sm text-neutral-500">Avg Rating</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-brand-100 to-pink-100 rounded-3xl aspect-square overflow-hidden animate-float">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop"
                alt="Fashion collection"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center animate-float shadow-xl" style={{ animationDelay: '1s' }}>
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">What We Stand For</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map((v, i) => <ValueCard key={v.title} value={v} delay={i * 100} />)}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div ref={milestonesReveal.ref} className={milestonesReveal.className}>
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Our Journey</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>How We Got Here</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-neutral-200" aria-hidden="true" />
            <div className="space-y-8">
              {MILESTONES.map((m, i) => (
                <div key={m.year} className="flex gap-6 items-start" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex flex-col items-center justify-center text-white shadow-lg">
                    <span className="text-xs font-bold">{m.year}</span>
                  </div>
                  <div className="card p-4 flex-1">
                    <p className="text-sm text-neutral-700 leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div ref={teamReveal.ref} className={`${teamReveal.className} text-center mb-12`}>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">The Humans Behind VOGUE</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>Meet Our Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {TEAM.map((member, i) => (
              <div key={member.name} className="text-center" style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3`}>
                  {member.initial}
                </div>
                <p className="font-semibold text-neutral-900">{member.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative py-20 text-center overflow-hidden" style={{ background: 'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ background: 'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 4s linear infinite', filter: 'drop-shadow(0 0 12px rgba(255,180,210,0.9))' }}>
            Ready to Experience VOGUE?
          </h2>
          <p className="text-white/85 mt-4">
            Join 10,000+ customers who've made VOGUE their go-to fashion destination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/products" className="bg-white text-brand-600 px-8 py-4 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg">
              Shop All Collections →
            </Link>
            <Link to="/register" className="glass text-white px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/20 transition-colors border border-white/30">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
