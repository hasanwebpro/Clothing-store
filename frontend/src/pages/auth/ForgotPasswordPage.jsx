import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-2xl font-bold text-ink-900 inline-block mb-6">
            VOGUE<span className="text-luxe-500">.</span>
          </Link>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Reset password</h1>
          <p className="mt-2 text-neutral-500 text-sm">
            Enter your email and we'll send you a secure reset link
          </p>
        </div>

        <div className="luxe-card p-8" style={{ boxShadow: 'none', border: '1px solid rgba(26,27,42,0.07)' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-neutral-500 mb-6">
                We've sent a reset link to <strong className="text-ink-900">{email}</strong>.<br />
                The link expires in 1 hour.
              </p>
              <Link to="/login" className="btn-luxe px-8 py-3">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input type="email" className="input" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <button type="submit" disabled={loading} className="btn-luxe w-full justify-center py-3.5">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </span>
                ) : 'Send Reset Link'}
              </button>
              <p className="text-center text-sm text-neutral-500">
                Remember your password?{' '}
                <Link to="/login" className="font-semibold text-ink-900 hover:text-brand-600 transition-colors">Sign in →</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
