import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';

import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, loginWithData } = useAuth();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleGoogleCredential = useCallback(async (credential) => {
    setLoading(true);
    try {
      const { data } = await authApi.googleAuth(credential);
      const user = loginWithData(data);
      toast.success(`Welcome to VOGUE, ${user.first_name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [navigate, loginWithData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authApi.register({
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.phone, password: form.password,
      });
      await login(form.email, form.password);
      toast.success('Account created! Welcome to VOGUE!');
      navigate('/', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.email) toast.error(`Email: ${data.email[0]}`);
      else toast.error(data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-center p-12"
        style={{ background: 'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10">
          <Link to="/" className="font-display text-3xl font-bold text-white tracking-tight block mb-12">
            VOGUE<span style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 50%,#fff 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite' }}>.</span>
          </Link>

          <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-4 text-white/70">
            — Join The Vogue Family
          </p>
          <h2 className="font-display text-5xl font-bold tracking-tight leading-[1.05] mb-6"
            style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 28px rgba(255,100,160,0.6))' }}>
            Fashion that<br />fits your life.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs mb-10">
            Create your account and unlock exclusive access to premium fashion, early collections, and member-only offers.
          </p>

          <div className="space-y-4">
            {[
              { step: '01', text: 'Create your free account' },
              { step: '02', text: 'Browse 500+ premium styles' },
              { step: '03', text: 'Checkout in seconds with COD or mobile payment' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-4">
                <span className="font-display text-sm font-bold flex-shrink-0 text-white/90">{step}</span>
                <span className="text-white/80 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-12 bg-white overflow-y-auto">

        <Link to="/" className="lg:hidden font-display text-2xl font-bold text-ink-900 mb-8">
          VOGUE<span className="text-luxe-500">.</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-7">
            <h1 className="font-display text-4xl font-semibold" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>Create account</h1>
            <p className="mt-2 text-neutral-500 text-sm">Start shopping today — it's completely free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input type="text" className="input" placeholder="Ali" value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input type="text" className="input" placeholder="Khan" value={form.last_name} onChange={set('last_name')} required />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>

            <div>
              <label className="label">
                Phone number{' '}
                <span className="text-neutral-400 font-normal text-xs">(optional)</span>
              </label>
              <input type="tel" className="input" placeholder="03xx-xxxxxxx" value={form.phone} onChange={set('phone')} />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  required minLength={8}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors"
                  aria-label="Toggle password visibility">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input type="password" className="input" placeholder="••••••••" value={form.confirm_password} onChange={set('confirm_password')} required autoComplete="new-password" />
            </div>

            <button type="submit" disabled={loading} className="btn-luxe w-full justify-center py-3.5 text-base mt-2"
              style={{ letterSpacing: '0.1em' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : 'Create My Account'}
            </button>

            <p className="text-xs text-center text-neutral-400 pt-1">
              By signing up you agree to our{' '}
              <span className="text-brand-600 cursor-pointer hover:underline">Terms of Service</span> &amp;{' '}
              <span className="text-brand-600 cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-xs text-neutral-400">or sign up with</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          <GoogleSignInButton onCredential={handleGoogleCredential} loading={loading} />

          <p className="text-center text-sm text-neutral-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-ink-900 hover:text-brand-600 transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
