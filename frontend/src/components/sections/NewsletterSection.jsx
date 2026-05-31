/**
 * NewsletterSection — Email capture for remarketing.
 *
 * Business Goal: Email subscribers convert 3x better than cold traffic.
 * This section builds a direct marketing channel for sales, new launches,
 * and abandoned cart recovery.
 *
 * Conversion Strategy:
 *  - Lead with VALUE ("Get 15% Off") not obligation ("Sign Up")
 *  - Single field (email only) — fewer fields = higher completion
 *  - Social proof: "Join 8,000+ subscribers"
 *  - Privacy reassurance: "No spam. Unsubscribe anytime."
 *
 * User Psychology: Reciprocity principle — give first (discount), then ask.
 * The user feels they're getting a deal, not being sold to.
 */
import { useState } from 'react';
import { newsletterApi } from '../../api/newsletter.api';
import { useRevealClass } from '../../hooks/useScrollReveal';
import toast from 'react-hot-toast';

const PERKS = [
  { label: 'Weekly style guides' },
  { label: 'Exclusive early access' },
  { label: 'Members-only sales' },
];

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { ref, className } = useRevealClass();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await newsletterApi.subscribe(email);
      setSubscribed(true);
      toast.success('Welcome! Your 15% coupon code WELCOME15 is on its way to your inbox.');
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error('This email is already subscribed!');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div ref={ref} className={`${className} relative max-w-2xl mx-auto px-4 sm:px-6 text-center`}>
        {/* Icon */}
        <div className="w-16 h-16 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Newsletter</span>

        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mt-3"
          style={{
            background: 'linear-gradient(135deg,#ffffff 0%,#ffd6ec 40%,#ffffff 70%,#ffb3d9 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'shimmer 4s linear infinite',
            filter: 'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 32px rgba(255,100,160,0.6))',
          }}>
          Get 15% Off Your First Order
        </h2>

        <p className="text-white/85 mt-4 text-lg">
          Subscribe for exclusive deals, new arrivals, and style inspiration delivered to your inbox.
        </p>

        <p className="text-sm text-white/75 mt-2">
          Join <strong className="text-white font-bold">8,000+</strong> fashion lovers already subscribed
        </p>

        {subscribed ? (
          <div className="mt-10 glass rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-brand-600/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-bold">You are in!</h3>
            <p className="text-white/80 mt-2">
              Check your email for your <strong className="text-white font-bold">15% discount code</strong>. It is valid for 7 days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10">
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-brand-400 focus:bg-white/15 transition-colors text-sm"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address for newsletter"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-105 text-sm whitespace-nowrap disabled:opacity-60"
              >
                {loading ? 'Subscribing...' : 'Get 15% Off'}
              </button>
            </div>
            <p className="text-xs text-white/70 mt-4 flex items-center justify-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              No spam, ever. Unsubscribe anytime. We respect your privacy.
            </p>
          </form>
        )}

        {/* Trust signals below form */}
        <div className="flex flex-wrap justify-center gap-6 mt-10">
          {PERKS.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-white/75 text-xs">
              <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {b.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
