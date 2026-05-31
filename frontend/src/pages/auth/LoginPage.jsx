import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';

import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import toast from 'react-hot-toast';

const BRAND_PERKS = [
  { text: 'Exclusive member-only collections' },
  { text: 'Free delivery on orders over PKR 2,000' },
  { text: 'Easy 30-day returns & exchanges' },
  { text: 'JazzCash, Easypaisa & COD accepted' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithData } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleGoogleCredential = useCallback(async (credential) => {
    setLoading(true);
    try {
      const { data } = await authApi.googleAuth(credential);
      const user = loginWithData(data);
      toast.success(`Welcome, ${user.first_name}!`);
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'seller') navigate('/seller/dashboard', { replace: true });
      else navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [navigate, from, loginWithData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.first_name}!`);
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'seller') navigate('/seller/dashboard', { replace: true });
      else navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ zoom: 1.1 }}>

      {/* ── Left brand hero ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10">
          <Link to="/" className="font-display text-3xl font-bold text-white tracking-tight">
            VOGUE<span style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 50%,#fff 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite' }}>.</span>
          </Link>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-4 text-white/70">
            — Premium Fashion Pakistan
          </p>
          <h2 className="font-display text-5xl font-bold tracking-tight leading-[1.05] mb-6"
            style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 28px rgba(255,100,160,0.6))' }}>
            Dress to Express<br />Yourself.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm mb-8">
            Discover hand-curated luxury fashion made for Pakistan's most discerning shoppers.
          </p>
          <div className="space-y-3">
            {BRAND_PERKS.map(({ text }) => (
              <div key={text} className="flex items-center gap-3">
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white/85 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {[['10k+', 'Happy Customers'], ['4.9★', 'Rated'], ['500+', 'Styles']].map(([val, lbl]) => (
            <div key={lbl} className="text-center">
              <p className="font-display text-2xl font-bold"
                style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 50%,#fff 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite' }}>
                {val}
              </p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-12 bg-white">

        <Link to="/" className="lg:hidden font-display text-2xl font-bold text-ink-900 mb-8">
          VOGUE<span className="text-luxe-500">.</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-semibold leading-tight" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>Welcome back</h1>
            <p className="mt-2 text-neutral-500 text-sm">Sign in to continue shopping</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                required autoComplete="email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-11" placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-luxe w-full justify-center py-3.5 text-base"
              style={{ letterSpacing: '0.1em' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-xs text-neutral-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          <GoogleSignInButton onCredential={handleGoogleCredential} loading={loading} />

          <p className="text-center text-sm text-neutral-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-ink-900 hover:text-brand-600 transition-colors">
              Create one free →
            </Link>
          </p>

          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-neutral-100">
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Login
            </span>
            <div className="w-px h-4 bg-neutral-200" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">256-bit SSL</span>
            <div className="w-px h-4 bg-neutral-200" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Privacy Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
