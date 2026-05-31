import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth.api';
import { ordersApi } from '../../api/orders.api';
import { paymentsApi } from '../../api/payments.api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

// ── Card brand SVG logos ──────────────────────────────────────────────────
function VisaLogo({ className = 'h-6' }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" rx="40" fill="#1A1F71"/>
      <path d="M293 332L329 170H384L348 332H293Z" fill="white"/>
      <path d="M530 175c-22-8-56-17-99-17-109 0-186 55-187 134-1 58 55 91 97 110 43 20 58 33 58 50-1 27-35 39-67 39-44 0-68-6-104-22l-15-7-16 93c26 11 73 21 122 22 115 0 190-54 191-138 1-46-29-81-93-110-39-18-63-30-63-49 0-16 20-34 64-34 37-1 63 7 84 16l10 5 16-92z" fill="white"/>
      <path d="M644 170h-85c-26 0-46 7-57 34l-162 128h115s19-50 23-61h140c3 14 13 61 13 61h101L644 170zm-134 137c9-23 43-111 43-111s9-23 14-38l7 34s20 96 24 115h-88z" fill="white"/>
      <path d="M221 170l-108 110-11-58c-20-63-81-132-150-166l99 276h116L337 170H221z" fill="white"/>
      <path d="M76 170H-49l-2 9c98 24 163 82 190 151l-27-136c-5-18-19-23-36-24z" fill="#F9A533"/>
    </svg>
  );
}

function MastercardLogo({ className = 'h-6' }) {
  return (
    <svg className={className} viewBox="0 0 152 108" xmlns="http://www.w3.org/2000/svg">
      <rect width="152" height="108" rx="8" fill="#252525"/>
      <circle cx="58" cy="54" r="34" fill="#EB001B"/>
      <circle cx="94" cy="54" r="34" fill="#F79E1B"/>
      <path d="M76 27.4C83.7 33.3 89 42 89 54s-5.3 20.7-13 26.6C68.3 74.7 63 65.9 63 54s5.3-20.7 13-26.6z" fill="#FF5F00"/>
    </svg>
  );
}

function AmexLogo({ className = 'h-6' }) {
  return (
    <svg className={className} viewBox="0 0 780 500" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" rx="40" fill="#2557D6"/>
      <path d="M170 180h66l20 46 20-46h65v4l-56 126h-58l-57-126v-4zm180 0h120v28h-90v22h87v28h-87v22h90v28H350V180zm135 0h66l27 40 27-40h65l-57 79 61 81h-67l-30-43-30 43h-66l61-81-57-79zm185 0h55v130h-55V180z" fill="white"/>
    </svg>
  );
}

function CardLogo({ type, className }) {
  if (type === 'visa') return <VisaLogo className={className} />;
  if (type === 'mastercard') return <MastercardLogo className={className} />;
  if (type === 'amex') return <AmexLogo className={className} />;
  return null;
}

// ── Luhn algorithm for card number validation ─────────────────────────────
function luhn(num) {
  const digits = num.replace(/\D/g, '');
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectCardType(num) {
  const n = num.replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2(2[2-9][1-9]|[3-6]\d\d|7[01]\d|720)/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return null;
}

function formatCardNumber(val) {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function validateCard(card) {
  const errors = {};
  const num = card.number.replace(/\s/g, '');
  if (!num) errors.number = 'Card number is required';
  else if (num.length < 15) errors.number = 'Card number is too short';
  else if (!luhn(num)) errors.number = 'Invalid card number';

  if (!card.name.trim()) errors.name = 'Cardholder name is required';
  else if (card.name.trim().length < 3) errors.name = 'Enter full name as on card';

  const [mm, yy] = card.expiry.split('/');
  if (!card.expiry || card.expiry.length < 5) {
    errors.expiry = 'Expiry date is required (MM/YY)';
  } else {
    const month = parseInt(mm, 10);
    const year = 2000 + parseInt(yy, 10);
    const now = new Date();
    if (month < 1 || month > 12) errors.expiry = 'Invalid month';
    else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
      errors.expiry = 'Card has expired';
  }

  const cvvLen = detectCardType(card.number) === 'amex' ? 4 : 3;
  if (!card.cvv) errors.cvv = 'CVV is required';
  else if (card.cvv.replace(/\D/g, '').length < cvvLen) errors.cvv = `CVV must be ${cvvLen} digits`;

  return errors;
}

const STEPS = [
  { label: 'Address', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { label: 'Payment', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { label: 'Review',  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

const PAYMENT_METHODS = [
  {
    id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    id: 'easypaisa', label: 'Easypaisa', desc: 'Mobile wallet — redirects to Easypaisa',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard — pay securely online',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
];

function formatPKR(n) { return `PKR ${Number(n).toLocaleString('en-PK')}`; }

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [step, setStep] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', street: '', city: '', province: '', postal_code: '' });
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [cardErrors, setCardErrors] = useState({});
  const [cvvVisible, setCvvVisible] = useState(false);
  const cardType = detectCardType(card.number);
  const [easypaisaTxn, setEasypaisaTxn] = useState('');
  const [easypaisaTxnError, setEasypaisaTxnError] = useState('');

  const { data: epInfo } = useQuery({
    queryKey: ['easypaisa-info'],
    queryFn: () => paymentsApi.getEasypaisaInfo().then(r => r.data),
    staleTime: Infinity,
  });

  const { data: addresses, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => authApi.getAddresses().then((r) => r.data?.results || r.data || []),
  });

  const items = cart?.items || [];
  const subtotal = cart?.subtotal ?? items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const discount = cart?.discount_amount ?? cart?.totals?.discount_amount ?? 0;
  const shipping = subtotal - discount >= 2000 ? 0 : 200;
  const total = subtotal - discount + shipping;

  const handleSaveAddress = async () => {
    if (!newAddr.street || !newAddr.city) { toast.error('Street and city are required'); return; }
    setSavingAddr(true);
    try {
      const { data } = await authApi.createAddress(newAddr);
      setSelectedAddress(data.id);
      setShowNewAddr(false);
      setNewAddr({ label: 'Home', street: '', city: '', province: '', postal_code: '' });
      await refetchAddresses();
      toast.success('Address saved');
    } catch { toast.error('Could not save address'); }
    finally { setSavingAddr(false); }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }

    // Validate based on payment method
    if (paymentMethod === 'card') {
      const errors = validateCard(card);
      setCardErrors(errors);
      if (Object.keys(errors).length > 0) { toast.error('Please fix the card details'); return; }
    }
    if (paymentMethod === 'easypaisa') {
      if (!easypaisaTxn.trim()) {
        setEasypaisaTxnError('Enter your Easypaisa transaction ID');
        toast.error('Enter your Easypaisa transaction ID');
        return;
      }
      if (easypaisaTxn.trim().length < 6) {
        setEasypaisaTxnError('Transaction ID looks too short');
        toast.error('Enter a valid transaction ID');
        return;
      }
    }

    setPlacing(true);
    try {
      const { data: order } = await ordersApi.placeOrder({
        shipping_address_id: selectedAddress,
        payment_method: paymentMethod,
        coupon_code: cart?.coupon?.code || null,
      });

      // Initiate payment for card and easypaisa
      if (paymentMethod === 'card') {
        await paymentsApi.initiatePayment({
          order_number: order.order_number,
          card_data: {
            card_number: card.number.replace(/\s/g, ''),
            cardholder_name: card.name,
            expiry: card.expiry,
          },
        });
      } else if (paymentMethod === 'easypaisa') {
        await paymentsApi.initiatePayment({
          order_number: order.order_number,
          transaction_ref: easypaisaTxn.trim(),
        });
      }

      toast.success('Order placed successfully!');
      navigate('/checkout/success', { state: { order }, replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place order. Please try again.');
    } finally { setPlacing(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-semibold text-ink-900">Checkout</h1>
        <p className="text-neutral-500 text-sm mt-1">Complete your order in 3 easy steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${i < step
                    ? 'cursor-pointer'
                    : i === step
                    ? 'ring-4 ring-ink-900/10 cursor-default'
                    : 'cursor-default'
                  }`}
                style={i < step ? {
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                } : i === step ? {
                  background: '#1a1b2a',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(26,27,42,0.25)',
                } : {
                  background: '#f3f4f6',
                  color: '#9ca3af',
                }}
                aria-label={s.label}
              >
                {i < step ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : s.icon}
              </button>
              <span className={`text-xs font-semibold ${i === step ? 'text-ink-900' : 'text-neutral-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-16 sm:w-24 h-0.5 mx-3 -mt-5 rounded-full transition-all duration-500"
                style={{ background: i < step ? 'linear-gradient(90deg,#10b981,#059669)' : '#e5e7eb' }} />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-8">

        {/* ── Step content ──────────────────────────────────────── */}
        <div className="lg:col-span-3">

          {/* Step 0: Address */}
          {step === 0 && (
            <div className="luxe-card p-6 space-y-4" style={{ boxShadow: 'none', border: '1px solid rgba(26,27,42,0.07)' }}>
              <h2 className="font-display text-xl font-semibold text-ink-900">Delivery Address</h2>

              {(!addresses || addresses.length === 0) && !showNewAddr && (
                <div className="text-center py-8 rounded-xl" style={{ background: 'rgba(26,27,42,0.02)', border: '1px dashed rgba(26,27,42,0.1)' }}>
                  <p className="text-sm text-neutral-500 mb-3">No saved addresses yet</p>
                  <button onClick={() => setShowNewAddr(true)} className="btn-primary text-sm py-2">
                    Add Your First Address
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {addresses?.map((addr) => (
                  <label key={addr.id}
                    className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                    style={selectedAddress === addr.id ? {
                      borderColor: 'rgba(26,27,42,0.8)',
                      background: 'rgba(26,27,42,0.03)',
                      boxShadow: '0 0 0 4px rgba(26,27,42,0.04)',
                    } : {
                      borderColor: 'rgba(26,27,42,0.1)',
                    }}>
                    <input type="radio" name="address" checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)} className="mt-1 accent-ink-900" />
                    <div>
                      <p className="font-semibold text-ink-900 text-sm flex items-center gap-2">
                        {addr.label || 'Home'}
                        {addr.is_default && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-luxe-50 text-luxe-700">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-neutral-600 mt-0.5">{addr.street}, {addr.city}</p>
                      {addr.province && <p className="text-xs text-neutral-400 mt-0.5">{addr.province} {addr.postal_code}</p>}
                    </div>
                  </label>
                ))}
              </div>

              {!showNewAddr ? (
                <button onClick={() => setShowNewAddr(true)}
                  className="w-full py-3 text-sm font-medium rounded-xl border-dashed border-2 cursor-pointer transition-colors"
                  style={{ borderColor: 'rgba(26,27,42,0.12)', color: 'rgba(26,27,42,0.5)' }}>
                  + Add New Address
                </button>
              ) : (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(26,27,42,0.02)', border: '1px solid rgba(26,27,42,0.08)' }}>
                  <h3 className="font-semibold text-sm text-ink-900">New Address</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Label</label>
                      <input type="text" className="input" placeholder="Home / Office" value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} /></div>
                    <div><label className="label">Postal Code</label>
                      <input type="text" className="input" value={newAddr.postal_code} onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })} /></div>
                  </div>
                  <div><label className="label">Street Address <span className="text-red-400">*</span></label>
                    <input type="text" className="input" placeholder="House #, Street, Area" value={newAddr.street} onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">City <span className="text-red-400">*</span></label>
                      <input type="text" className="input" placeholder="Lahore" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} required /></div>
                    <div><label className="label">Province</label>
                      <input type="text" className="input" placeholder="Punjab" value={newAddr.province} onChange={(e) => setNewAddr({ ...newAddr, province: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveAddress} disabled={savingAddr} className="btn-primary py-2 text-sm flex-1 justify-center">
                      {savingAddr ? 'Saving…' : 'Save Address'}
                    </button>
                    <button onClick={() => setShowNewAddr(false)} className="btn-secondary py-2 text-sm">Cancel</button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { if (!selectedAddress) { toast.error('Select a delivery address'); return; } setStep(1); }}
                className="btn-luxe w-full justify-center py-3.5"
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <div className="luxe-card p-6 space-y-5" style={{ boxShadow: 'none', border: '1px solid rgba(26,27,42,0.07)' }}>
              <h2 className="font-display text-xl font-semibold text-ink-900">Payment Method</h2>

              {/* Method selector */}
              <div className="space-y-3">
                {PAYMENT_METHODS.map((m) => {
                  const isActive = paymentMethod === m.id;
                  return (
                    <label key={m.id}
                      className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                      style={isActive ? { borderColor: 'rgba(26,27,42,0.7)', background: 'rgba(26,27,42,0.03)', boxShadow: '0 0 0 4px rgba(26,27,42,0.04)' } : { borderColor: 'rgba(26,27,42,0.1)' }}>
                      <input type="radio" name="payment" checked={isActive}
                        onChange={() => { setPaymentMethod(m.id); setCardErrors({}); }} className="accent-ink-900" />
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'text-ink-900' : 'text-neutral-400'}`}
                        style={{ background: isActive ? 'rgba(212,160,23,0.12)' : 'rgba(26,27,42,0.04)' }}>
                        {m.icon}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-ink-900 text-sm">{m.label}</p>
                        <p className="text-xs text-neutral-500">{m.desc}</p>
                      </div>
                      {isActive && (
                        <svg className="w-5 h-5 text-ink-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* ── Easypaisa manual payment ───────────────────────────── */}
              {paymentMethod === 'easypaisa' && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8f5e9', boxShadow: '0 4px 24px rgba(0,163,0,0.08)' }}>

                  {/* ── Hero banner ───────────────────────────────────────── */}
                  <div className="relative px-6 py-5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #1a6b1a 0%, #2e7d32 40%, #388e3c 100%)' }}>
                    {/* Subtle pattern */}
                    <div className="absolute inset-0 opacity-[0.06]"
                      style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-green-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">Pay with</p>
                        <p className="text-white text-2xl font-black tracking-tight">Easypaisa</p>
                        <p className="text-green-200 text-xs mt-0.5">Mobile wallet payment</p>
                      </div>
                      {/* Easypaisa-style icon */}
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-5 bg-white">

                    {/* ── Amount + phone card ──────────────────────────────── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e8f5e9' }}>
                      {/* Amount row */}
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ background: 'linear-gradient(90deg,#f1f8e9,#e8f5e9)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-600">
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                            </svg>
                          </div>
                          <span className="text-sm font-semibold text-neutral-700">Amount to send</span>
                        </div>
                        <span className="font-display text-lg font-bold text-green-700">{formatPKR(total)}</span>
                      </div>

                      {/* Divider */}
                      <div className="h-px" style={{ background: '#e8f5e9' }} />

                      {/* Phone number row */}
                      <div className="flex items-center justify-between px-4 py-3 bg-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-600">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Send to this number</p>
                            <p className="font-mono font-bold text-ink-900 text-base tracking-widest">
                              {(epInfo?.merchant_phone || '03092584328').replace(/^(\d{4})(\d{7})/, '$1 $2')}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full text-green-700"
                          style={{ background: '#e8f5e9' }}>
                          {epInfo?.account_title || 'VOGUE Store'}
                        </span>
                      </div>
                    </div>

                    {/* ── Steps ───────────────────────────────────────────── */}
                    <div className="space-y-2.5">
                      {[
                        { icon: '📱', text: 'Open your Easypaisa app' },
                        { icon: '💸', text: `Send ${formatPKR(total)} to the number above (Send Money → Mobile Account)` },
                        { icon: '📋', text: 'Copy the Transaction ID shown on the confirmation screen' },
                        { icon: '✅', text: 'Paste it below — your order will be confirmed once verified' },
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                          style={{ background: i === 1 ? 'rgba(0,163,0,0.04)' : 'transparent', border: i === 1 ? '1px solid rgba(0,163,0,0.1)' : '1px solid transparent' }}>
                          <span className="text-base flex-shrink-0 mt-0.5">{step.icon}</span>
                          <div className="flex items-start gap-2 flex-1">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                              style={{ background: '#2e7d32' }}>{i + 1}</span>
                            <span className="text-sm text-neutral-700">{step.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Transaction ID input ─────────────────────────────── */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: '#f9fbe7', border: '1px solid #dcedc8' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <label className="text-sm font-bold text-green-900">
                          Easypaisa Transaction ID <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 123456789012"
                        value={easypaisaTxn}
                        onChange={e => { setEasypaisaTxn(e.target.value.replace(/\D/g, '')); setEasypaisaTxnError(''); }}
                        maxLength={20}
                        className={`input font-mono text-base tracking-[0.15em] ${easypaisaTxnError ? 'border-red-400' : 'border-green-200 focus:border-green-500'}`}
                        style={{ background: 'white' }}
                      />
                      {easypaisaTxnError
                        ? <p className="text-xs text-red-500 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                            {easypaisaTxnError}
                          </p>
                        : <p className="text-xs text-green-700 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Order confirmed once merchant verifies your payment (usually within minutes).
                          </p>
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* ── Card form ──────────────────────────────────────────── */}
              {paymentMethod === 'card' && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(26,27,42,0.02)', border: '1px solid rgba(26,27,42,0.08)' }}>

                  {/* Live card preview */}
                  <div className="relative h-44 rounded-2xl p-5 overflow-hidden select-none"
                    style={{ background: 'linear-gradient(135deg,#1a1b2a 0%,#2d2060 50%,#1a1b2a 100%)', boxShadow: '0 20px 40px rgba(26,27,42,0.4)' }}>
                    <div className="absolute inset-0 opacity-10"
                      style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
                    {/* Chip + card brand logo */}
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-7 rounded-md" style={{ background: 'linear-gradient(135deg,#ffd700,#ffa500)', opacity: 0.9 }} />
                      <div className="h-8 flex items-center">
                        {cardType
                          ? <CardLogo type={cardType} className="h-8 drop-shadow-lg" />
                          : <div className="w-14 h-8 rounded bg-white/10" />
                        }
                      </div>
                    </div>
                    {/* Card number */}
                    <p className="text-white font-mono text-lg tracking-[0.2em] mt-5 drop-shadow">
                      {card.number || '•••• •••• •••• ••••'}
                    </p>
                    {/* Name + expiry */}
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-white/50 text-[10px] uppercase tracking-wider">Cardholder</p>
                        <p className="text-white text-sm font-semibold tracking-wide truncate max-w-[160px]">
                          {card.name.toUpperCase() || 'FULL NAME'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/50 text-[10px] uppercase tracking-wider">Expires</p>
                        <p className="text-white text-sm font-mono">{card.expiry || 'MM/YY'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card number */}
                  <div>
                    <label className="label">Card Number</label>
                    <div className="relative">
                      <input
                        type="text" inputMode="numeric" maxLength={19}
                        placeholder="1234 5678 9012 3456"
                        value={card.number}
                        onChange={e => {
                          setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }));
                          setCardErrors(err => ({ ...err, number: undefined }));
                        }}
                        className={`input pr-12 font-mono tracking-widest ${cardErrors.number ? 'border-red-400 focus:border-red-400' : ''}`}
                      />
                      {/* Card brand logo inside input */}
                      {cardType && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CardLogo type={cardType} className="h-5" />
                        </span>
                      )}
                    </div>
                    {cardErrors.number && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{cardErrors.number}</p>}
                  </div>

                  {/* Cardholder name */}
                  <div>
                    <label className="label">Cardholder Name</label>
                    <input
                      type="text" placeholder="Name as it appears on card"
                      value={card.name}
                      onChange={e => {
                        setCard(c => ({ ...c, name: e.target.value }));
                        setCardErrors(err => ({ ...err, name: undefined }));
                      }}
                      className={`input uppercase ${cardErrors.name ? 'border-red-400 focus:border-red-400' : ''}`}
                    />
                    {cardErrors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{cardErrors.name}</p>}
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Expiry Date</label>
                      <input
                        type="text" inputMode="numeric" placeholder="MM/YY" maxLength={5}
                        value={card.expiry}
                        onChange={e => {
                          setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }));
                          setCardErrors(err => ({ ...err, expiry: undefined }));
                        }}
                        className={`input font-mono ${cardErrors.expiry ? 'border-red-400 focus:border-red-400' : ''}`}
                      />
                      {cardErrors.expiry && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{cardErrors.expiry}</p>}
                    </div>
                    <div>
                      <label className="label">CVV</label>
                      <div className="relative">
                        <input
                          type={cvvVisible ? 'text' : 'password'}
                          inputMode="numeric"
                          placeholder={detectCardType(card.number) === 'amex' ? '4 digits' : '3 digits'}
                          maxLength={detectCardType(card.number) === 'amex' ? 4 : 3}
                          value={card.cvv}
                          onChange={e => {
                            setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }));
                            setCardErrors(err => ({ ...err, cvv: undefined }));
                          }}
                          className={`input pr-10 font-mono ${cardErrors.cvv ? 'border-red-400 focus:border-red-400' : ''}`}
                        />
                        <button type="button" onClick={() => setCvvVisible(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {cvvVisible
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                            }
                          </svg>
                        </button>
                      </div>
                      {cardErrors.cvv && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{cardErrors.cvv}</p>}
                    </div>
                  </div>

                  {/* Security note */}
                  <div className="flex items-center gap-2 pt-1">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs text-neutral-500">Your card details are encrypted with 256-bit SSL and never stored.</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(0)} className="btn-secondary flex-none py-3 px-5 text-sm">← Back</button>
                <button
                  onClick={() => {
                    if (paymentMethod === 'card') {
                      const errors = validateCard(card);
                      setCardErrors(errors);
                      if (Object.keys(errors).length > 0) { toast.error('Fix card details to continue'); return; }
                    }
                    if (paymentMethod === 'easypaisa' && !easypaisaTxn.trim()) {
                      setEasypaisaTxnError('Enter your Easypaisa transaction ID');
                      toast.error('Enter your Easypaisa transaction ID');
                      return;
                    }
                    setStep(2);
                  }}
                  className="btn-luxe flex-1 justify-center py-3">
                  Review Order →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="luxe-card p-6 space-y-5" style={{ boxShadow: 'none', border: '1px solid rgba(26,27,42,0.07)' }}>
              <h2 className="font-display text-xl font-semibold text-ink-900">Review Your Order</h2>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2"
                    style={{ borderBottom: '1px solid rgba(26,27,42,0.06)' }}>
                    <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#fdf4ff,#faf9e9)' }}>
                      {(item.primary_image || item.product_image)
                        ? <img src={item.primary_image || item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" /></svg>
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">{item.product_name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-ink-900 tabular-nums">
                      {formatPKR(item.unit_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Delivery + payment summary */}
              <div className="p-4 rounded-xl space-y-2 text-sm"
                style={{ background: 'rgba(26,27,42,0.02)', border: '1px solid rgba(26,27,42,0.06)' }}>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Deliver to</span>
                  <span className="font-semibold text-ink-900">
                    {addresses?.find((a) => a.id === selectedAddress)?.city || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Payment</span>
                  <span className="font-semibold text-ink-900">
                    {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-none py-3 px-5 text-sm">← Back</button>
                <button onClick={handlePlaceOrder} disabled={placing} className="btn-gold flex-1 py-3.5 text-sm justify-center font-bold rounded-xl">
                  {placing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Placing order…
                    </span>
                  ) : `Place Order — ${formatPKR(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Order summary sidebar ─────────────────────────────── */}
        <aside className="lg:col-span-2">
          <div className="sticky top-24 luxe-card p-5 space-y-4"
            style={{ boxShadow: 'none', border: '1px solid rgba(26,27,42,0.07)' }}>
            <h3 className="font-display text-lg font-semibold text-ink-900">Order Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                <span className="font-medium text-ink-900 tabular-nums">{formatPKR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 font-medium">Discount</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">−{formatPKR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Shipping</span>
                <span className={`font-medium tabular-nums ${shipping === 0 ? 'text-emerald-600' : 'text-ink-900'}`}>
                  {shipping === 0 ? 'Free' : formatPKR(shipping)}
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center"
              style={{ borderTop: '1px solid rgba(26,27,42,0.08)' }}>
              <span className="font-bold text-ink-900">Total</span>
              <span className="font-display text-2xl font-bold text-ink-900 tabular-nums">
                {formatPKR(total)}
              </span>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 pt-1">
              <svg className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wide">
                Secure checkout · SSL encrypted
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
