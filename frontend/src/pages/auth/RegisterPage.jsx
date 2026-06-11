import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import toast from 'react-hot-toast';

// Password strength: 0–3
function passwordStrength(p) {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(score, 3);
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#22c55e'];
const STRENGTH_BG = ['bg-neutral-100', 'bg-red-400', 'bg-amber-400', 'bg-green-400'];

function StrengthBar({ value }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map(i => (
          <div key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= value ? STRENGTH_BG[value] : 'bg-neutral-100'}`} />
        ))}
      </div>
      {value > 0 && (
        <span className="text-[11px] font-semibold transition-colors" style={{ color: STRENGTH_COLORS[value] }}>
          {STRENGTH_LABELS[value]}
        </span>
      )}
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, loginWithData } = useAuth();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = passwordStrength(form.password);
  const passwordsMatch = form.confirm_password && form.password === form.confirm_password;
  const passwordsMismatch = form.confirm_password && form.password !== form.confirm_password;

  const set = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // Validate a single field on blur
  const validateField = (key) => {
    const val = form[key];
    let msg = '';
    if (key === 'first_name' && !val.trim()) msg = 'First name is required';
    if (key === 'last_name' && !val.trim()) msg = 'Last name is required';
    if (key === 'email') {
      if (!val.trim()) msg = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = 'Enter a valid email address';
    }
    if (key === 'phone' && val && !/^(03\d{9}|3\d{9})$/.test(val.replace(/[-\s]/g, '')))
      msg = 'Enter a valid Pakistani mobile number (e.g. 03001234567)';
    if (key === 'password') {
      if (!val) msg = 'Password is required';
      else if (val.length < 8) msg = 'Password must be at least 8 characters';
    }
    if (key === 'confirm_password') {
      if (!val) msg = 'Please confirm your password';
      else if (val !== form.password) msg = 'Passwords do not match';
    }
    if (msg) setErrors(prev => ({ ...prev, [key]: msg }));
  };

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
    // Run all validations
    const newErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Enter a valid email address';
    if (form.phone && !/^(03\d{9}|3\d{9})$/.test(form.phone.replace(/[-\s]/g, '')))
      newErrors.phone = 'Enter a valid Pakistani mobile number';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm_password) newErrors.confirm_password = 'Passwords do not match';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        first_name:       form.first_name.trim(),
        last_name:        form.last_name.trim(),
        email:            form.email.trim(),
        phone:            form.phone.trim(),
        password:         form.password,
        password_confirm: form.confirm_password,
      });
      await login(form.email.trim(), form.password);
      toast.success('Account created! Welcome to VOGUE!');
      navigate('/', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.email)      setErrors(p => ({ ...p, email: data.email[0] }));
      else if (data?.first_name) setErrors(p => ({ ...p, first_name: data.first_name[0] }));
      else if (data?.password)   setErrors(p => ({ ...p, password: data.password[0] }));
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

          <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-4 text-white/70">— Join The Vogue Family</p>
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
            <h1 className="font-display text-4xl font-semibold"
              style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>
              Create account
            </h1>
            <p className="mt-2 text-neutral-500 text-sm">Start shopping today — it's completely free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name <span className="text-red-400">*</span></label>
                <input type="text" className={`input ${errors.first_name ? 'border-red-400 focus:border-red-400' : ''}`}
                  placeholder="Ali" value={form.first_name}
                  onChange={set('first_name')} onBlur={() => validateField('first_name')}
                  autoComplete="given-name" />
                <FieldError msg={errors.first_name} />
              </div>
              <div>
                <label className="label">Last name <span className="text-red-400">*</span></label>
                <input type="text" className={`input ${errors.last_name ? 'border-red-400 focus:border-red-400' : ''}`}
                  placeholder="Khan" value={form.last_name}
                  onChange={set('last_name')} onBlur={() => validateField('last_name')}
                  autoComplete="family-name" />
                <FieldError msg={errors.last_name} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address <span className="text-red-400">*</span></label>
              <input type="email" className={`input ${errors.email ? 'border-red-400 focus:border-red-400' : ''}`}
                placeholder="you@example.com" value={form.email}
                onChange={set('email')} onBlur={() => validateField('email')}
                autoComplete="email" />
              <FieldError msg={errors.email} />
            </div>

            {/* Phone with +92 prefix */}
            <div>
              <label className="label">
                Phone number
                <span className="text-neutral-400 font-normal text-xs ml-1">(optional)</span>
              </label>
              <div className="flex gap-0">
                <div className="flex items-center px-3 rounded-l-xl border border-r-0 bg-neutral-50 text-neutral-500 text-sm select-none flex-shrink-0"
                  style={{ borderColor: 'rgba(26,27,42,0.13)' }}>
                  🇵🇰 +92
                </div>
                <input type="tel" inputMode="numeric"
                  className={`input rounded-l-none flex-1 ${errors.phone ? 'border-red-400 focus:border-red-400' : ''}`}
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={e => {
                    const v = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                    setForm(p => ({ ...p, phone: v }));
                    setErrors(p => ({ ...p, phone: undefined }));
                  }}
                  onBlur={() => validateField('phone')}
                  autoComplete="tel-national"
                />
              </div>
              <FieldError msg={errors.phone} />
            </div>

            {/* Password */}
            <div>
              <label className="label">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input pr-11 ${errors.password ? 'border-red-400 focus:border-red-400' : ''}`}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  onBlur={() => validateField('password')}
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
              {form.password && <StrengthBar value={strength} />}
              <FieldError msg={errors.password} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className={`input pr-11 ${errors.confirm_password || passwordsMismatch ? 'border-red-400 focus:border-red-400' : passwordsMatch ? 'border-green-400 focus:border-green-400' : ''}`}
                  placeholder="Re-enter password"
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  onBlur={() => validateField('confirm_password')}
                  autoComplete="new-password"
                />
                {/* Match indicator */}
                {form.confirm_password && (
                  <span className="absolute right-9 top-1/2 -translate-y-1/2">
                    {passwordsMatch
                      ? <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    }
                  </span>
                )}
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors"
                  aria-label="Toggle password visibility">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showConfirm
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              <FieldError msg={errors.confirm_password} />
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
