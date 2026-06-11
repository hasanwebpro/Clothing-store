/**
 * ContactPage — the View for two use cases: "Contact Customer Support" and
 * "Submit Feedback" (toggled by a tab).
 *
 * SDA Note (frontend MVC mapping):
 *   • View       — this component (presentation only)
 *   • Controller — supportApi (api/support.api.js) is the boundary to the server
 *   • Model      — SupportTicket on the backend (apps/support)
 * The submit flow uses React Query's useMutation, so loading/success/error
 * state is managed declaratively rather than with manual flags.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supportApi } from '../../api/support.api';
import { useAuth } from '../../context/AuthContext';
import { useSEO } from '../../hooks/useSEO';
import toast from 'react-hot-toast';
import { IconMapPin, IconPhone, IconEnvelope, IconPending, IconCheckCircle, IconStar } from '../../components/ui/Icons';

const SHIMMER = {
  background: 'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  animation: 'shimmer 4s linear infinite',
  filter: 'drop-shadow(0 0 8px rgba(236,110,173,0.4))',
};

const CONTACT_INFO = [
  { icon: <IconMapPin className="w-5 h-5 text-brand-500" />,  label: 'Visit us',  value: 'Gulberg III, Lahore, Pakistan' },
  { icon: <IconPhone className="w-5 h-5 text-brand-500" />,   label: 'Call us',   value: '+92 42 111 VOGUE (86483)' },
  { icon: <IconEnvelope className="w-5 h-5 text-brand-500" />, label: 'Email us', value: 'support@vogue.pk' },
  { icon: <IconPending className="w-5 h-5 text-brand-500" />, label: 'Hours',     value: 'Mon–Sat, 9am – 9pm PKT' },
];

export default function ContactPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('contact');
  const [form, setForm] = useState({
    name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useSEO({ title: 'Contact & Feedback', description: 'Get in touch with VOGUE customer support or share your feedback.' });

  const mutation = useMutation({
    mutationFn: () => supportApi.createTicket({
      kind: tab,
      name: form.name,
      email: form.email,
      subject: tab === 'contact' ? form.subject : 'Customer Feedback',
      message: form.message,
      rating: tab === 'feedback' ? (rating || null) : null,
    }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success(tab === 'contact' ? 'Message sent! We\'ll reply soon.' : 'Thanks for your feedback!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Something went wrong'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (tab === 'feedback' && !rating) {
      toast.error('Please give a star rating');
      return;
    }
    mutation.mutate();
  }

  function resetForm() {
    setSubmitted(false);
    setForm({ ...form, subject: '', message: '' });
    setRating(0);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight" style={SHIMMER}>
          We'd Love to Hear From You
        </h1>
        <p className="text-neutral-500 mt-3 max-w-xl mx-auto">
          Questions, issues, or ideas — our team is here to help. Reach out and we'll get back within 24 hours.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Contact info */}
        <div className="md:col-span-2 space-y-4">
          {CONTACT_INFO.map((c) => (
            <div key={c.label} className="card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">{c.icon}</div>
              <div>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{c.label}</p>
                <p className="text-sm font-semibold text-neutral-800 mt-0.5">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="md:col-span-3 card p-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 mb-6">
            {[
              { key: 'contact', label: 'Contact Support' },
              { key: 'feedback', label: 'Leave Feedback' },
            ].map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setSubmitted(false); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {submitted ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)' }}>
                <IconCheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-neutral-900">Thank you!</h3>
              <p className="text-sm text-neutral-500 mt-2">
                {tab === 'contact'
                  ? 'Your message is on its way to our support team. We\'ll reply by email shortly.'
                  : 'Your feedback helps us improve. We appreciate you taking the time!'}
              </p>
              <button onClick={resetForm} className="btn-secondary mt-5 px-6 py-2.5">Send another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>

              {tab === 'contact' && (
                <div>
                  <label className="label">Subject</label>
                  <input className="input" placeholder="How can we help?" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                </div>
              )}

              {tab === 'feedback' && (
                <div>
                  <label className="label">Your rating *</label>
                  <div className="flex gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                        style={{ color: s <= (hoverRating || rating) ? '#fbbf24' : '#d1d5db' }}>
                        <IconStar className="w-8 h-8" filled={s <= (hoverRating || rating)} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Message *</label>
                <textarea className="input resize-none" rows={5}
                  placeholder={tab === 'contact' ? 'Describe your question or issue…' : 'Tell us what you think…'}
                  value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
              </div>

              <button type="submit" disabled={mutation.isLoading} className="btn-primary w-full py-3">
                {mutation.isLoading ? 'Sending…' : tab === 'contact' ? 'Send Message' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
