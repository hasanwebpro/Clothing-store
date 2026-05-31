import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const SHIMMER = {
  background: 'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  animation: 'shimmer 4s linear infinite',
  filter: 'drop-shadow(0 0 8px rgba(236,110,173,0.4))',
};

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, updateItem, removeItem, applyCoupon, removeCoupon, isLoading } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const discount = cart?.discount_amount || 0;
  const freeShipping = subtotal - discount >= 2000;
  const shipping = freeShipping ? 0 : 200;
  const total = subtotal - discount + shipping;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput.trim().toUpperCase());
      toast.success('Coupon applied!');
      setCouponInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally { setCouponLoading(false); }
  };

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="space-y-4">
        {[...Array(3)].map((_,i) => <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="max-w-5xl mx-auto px-4 py-24 text-center">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background:'linear-gradient(135deg,rgba(192,0,90,0.08),rgba(123,94,167,0.06))' }}>
        <svg className="w-12 h-12 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h1 className="font-display text-4xl font-bold mb-3" style={SHIMMER}>Your cart is empty</h1>
      <p className="text-neutral-500 mb-8 text-lg">Looks like you haven't added anything yet.</p>
      <Link to="/products"
        className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white cursor-pointer transition-all"
        style={{ background:'linear-gradient(135deg,#EC6EAD,#7b5ea7)', boxShadow:'0 4px 20px rgba(236,110,173,0.35)' }}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        Start Shopping
      </Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-baseline gap-3 mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight" style={SHIMMER}>Shopping Cart</h1>
        <span className="text-base text-neutral-400 font-normal">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Item list ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="luxe-card p-4 flex gap-4 hover:shadow-none transition-shadow"
              style={{ boxShadow:'none', border:'1px solid rgba(26,27,42,0.07)' }}>

              {/* Image */}
              <Link to={`/products/${item.product_slug || item.slug}`}
                className="w-20 h-24 bg-neutral-50 rounded-xl overflow-hidden flex-shrink-0 block">
                {item.product_image || item.primary_image ? (
                  <img src={item.product_image || item.primary_image} alt={item.product_name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-200">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_slug || item.slug}`}
                  className="font-semibold text-neutral-900 hover:text-brand-600 transition-colors truncate block text-sm md:text-base">
                  {item.product_name}
                </Link>
                {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {Object.entries(item.variant_attributes).map(([k,v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
                <p className="text-sm font-bold text-neutral-900 mt-2 tabular-nums">
                  PKR {Number(item.unit_price).toLocaleString()}
                </p>

                <div className="flex items-center justify-between mt-3">
                  {/* Qty stepper */}
                  <div className="flex items-center rounded-xl border-2 border-neutral-200 overflow-hidden">
                    <button onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 transition-colors cursor-pointer font-bold text-neutral-600">
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-neutral-900 tabular-nums">{item.quantity}</span>
                    <button onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 transition-colors cursor-pointer font-bold text-neutral-600">
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-900 tabular-nums text-sm">
                      PKR {Number(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                    <button onClick={() => removeItem(item.id)}
                      className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer"
                      aria-label="Remove item">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors mt-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Continue Shopping
          </Link>
        </div>

        {/* ── Order summary ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="luxe-card p-6 space-y-4 sticky top-24" style={{ boxShadow:'none', border:'1px solid rgba(26,27,42,0.07)' }}>
            <h2 className="font-display text-xl font-semibold text-neutral-900">Order Summary</h2>

            {/* Free shipping progress */}
            {!freeShipping && (
              <div className="rounded-xl p-3 space-y-2"
                style={{ background:'rgba(236,110,173,0.05)', border:'1px solid rgba(236,110,173,0.12)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-600">Add <strong className="text-brand-600">PKR {(2000 - (subtotal - discount)).toLocaleString()}</strong> for free delivery</span>
                  <span className="text-neutral-400">{Math.round(((subtotal-discount)/2000)*100)}%</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width:`${Math.min(100,((subtotal-discount)/2000)*100)}%`, background:'linear-gradient(90deg,#EC6EAD,#7b5ea7)' }} />
                </div>
              </div>
            )}
            {freeShipping && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.12)' }}>
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold text-emerald-600">You qualify for free delivery!</span>
              </div>
            )}

            {/* Coupon */}
            {cart?.coupon ? (
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v1h-.5A1.5 1.5 0 001 6.5v1A1.5 1.5 0 002.5 9H3v4.5A2.5 2.5 0 005.5 16h9a2.5 2.5 0 002.5-2.5V9h.5A1.5 1.5 0 0019 7.5v-1A1.5 1.5 0 0017.5 5H17V4a2 2 0 00-2-2H5z" clipRule="evenodd" /></svg>
                  <span className="text-sm font-semibold text-emerald-700 font-mono">{cart.coupon.code}</span>
                </div>
                <button onClick={removeCoupon} className="text-xs text-neutral-400 hover:text-red-500 cursor-pointer transition-colors">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" className="input py-2 text-sm flex-1" placeholder="Coupon code"
                  value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()} />
                <button onClick={handleApplyCoupon} disabled={couponLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all whitespace-nowrap disabled:opacity-50"
                  style={{ background:'rgba(192,0,90,0.08)', color:'#c0005a', border:'1px solid rgba(192,0,90,0.2)' }}>
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2.5 text-sm border-t border-neutral-100 pt-4">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal ({items.length} item{items.length!==1?'s':''})</span>
                <span className="font-medium tabular-nums">PKR {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon discount</span>
                  <span className="tabular-nums">−PKR {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-600">Delivery</span>
                <span className={`font-medium tabular-nums ${freeShipping ? 'text-emerald-600' : ''}`}>
                  {freeShipping ? 'Free' : `PKR ${shipping}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t border-neutral-100 pt-3">
                <span className="font-bold text-neutral-900">Total</span>
                <span className="font-display text-2xl font-bold text-neutral-900 tabular-nums">PKR {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button onClick={() => navigate('/checkout')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold text-white tracking-wide transition-all cursor-pointer"
              style={{ background:'linear-gradient(135deg,#EC6EAD,#7b5ea7)', boxShadow:'0 4px 20px rgba(236,110,173,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 8px 32px rgba(236,110,173,0.55)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(236,110,173,0.35)'}>
              Proceed to Checkout
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            {/* Payment badges */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {['COD','JazzCash','Easypaisa'].map(m => (
                <span key={m} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
