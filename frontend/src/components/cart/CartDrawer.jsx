import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatCurrency';

function SpinnerDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-12">
      {[0,1,2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-luxe-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export default function CartDrawer({ isOpen, onClose }) {
  const { items, totals, itemCount, isLoading, updateItem, removeItem } = useCart();
  const subtotal = totals?.subtotal || 0;
  const discount = totals?.discount_amount || 0;
  const freeShipping = subtotal - discount >= 2000;
  const shipping = freeShipping ? 0 : 200;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300"
          style={{ background: 'rgba(11,12,24,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-50 flex flex-col
          w-full max-w-[380px] transition-transform duration-350
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '-8px 0 48px rgba(11,12,24,0.18), -1px 0 0 rgba(11,12,24,0.06)',
        }}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(26,27,42,0.07)' }}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-ink-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="font-display text-xl font-semibold text-ink-900">
              Your Cart
            </h2>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#c026d3,#d4a017)' }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Free shipping progress */}
        {!freeShipping && subtotal > 0 && (
          <div className="px-6 py-3 flex-shrink-0" style={{ background: 'rgba(212,160,23,0.04)', borderBottom: '1px solid rgba(212,160,23,0.08)' }}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-neutral-500">
                Add <span className="font-semibold text-luxe-600">{formatCurrency(2000 - (subtotal - discount))}</span> for free delivery
              </span>
              <span className="text-neutral-400">{Math.round(((subtotal - discount) / 2000) * 100)}%</span>
            </div>
            <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((subtotal - discount) / 2000) * 100)}%`,
                  background: 'linear-gradient(90deg, #d4a017, #f5d847)',
                }}
              />
            </div>
          </div>
        )}
        {freeShipping && subtotal > 0 && (
          <div className="px-6 py-2.5 flex items-center gap-2 flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.10)' }}>
            <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-emerald-600">You qualify for free delivery!</span>
          </div>
        )}

        {/* ── Items ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 admin-scroll">
          {isLoading ? <SpinnerDots /> : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(192,38,211,0.08), rgba(212,160,23,0.06))' }}>
                <svg className="w-9 h-9 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="font-display text-xl text-ink-900 mb-1">Your cart is empty</p>
              <p className="text-sm text-neutral-400 mb-6">Discover luxury fashion curated just for you</p>
              <button
                onClick={onClose}
                className="btn-luxe px-6 py-2.5 text-xs"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id}
                className="flex gap-3 p-3 rounded-2xl transition-colors group"
                style={{ background: 'rgba(26,27,42,0.02)', border: '1px solid rgba(26,27,42,0.05)' }}>
                {/* Image */}
                <div className="relative flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#fdf4ff,#faf9e9)' }}>
                  {item.primary_image ? (
                    <img src={item.primary_image} alt={item.product_name}
                      className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate leading-snug">{item.product_name}</p>
                  {item.variant_attrs?.length > 0 && (
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {item.variant_attrs.map(a => `${a.attribute}: ${a.value}`).join(' · ')}
                    </p>
                  )}
                  <p className="text-sm font-bold text-ink-900 mt-1.5">{formatCurrency(item.unit_price)}</p>

                  <div className="flex items-center justify-between mt-2">
                    {/* Qty stepper */}
                    <div className="flex items-center gap-1.5 rounded-lg p-0.5"
                      style={{ background: 'rgba(26,27,42,0.05)', border: '1px solid rgba(26,27,42,0.08)' }}>
                      <button
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-ink-700 hover:bg-white transition-all text-sm font-bold cursor-pointer"
                        aria-label="Decrease quantity"
                      >−</button>
                      <span className="text-sm font-semibold w-5 text-center text-ink-900 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        disabled={item.quantity >= (item.max_quantity || 99)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-ink-700 hover:bg-white transition-all text-sm font-bold disabled:opacity-30 cursor-pointer"
                        aria-label="Increase quantity"
                      >+</button>
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[11px] font-medium text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.product_name} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-5 py-5 space-y-3"
            style={{ borderTop: '1px solid rgba(26,27,42,0.07)', background: 'rgba(250,250,251,0.97)' }}>
            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-semibold text-ink-900">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600 font-medium">Coupon discount</span>
                  <span className="font-semibold text-emerald-600">−{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Delivery</span>
                <span className={`font-semibold ${freeShipping ? 'text-emerald-600' : 'text-ink-900'}`}>
                  {freeShipping ? 'Free' : formatCurrency(shipping)}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(26,27,42,0.07)' }}>
                <span className="text-sm font-bold text-ink-900">Total</span>
                <span className="font-display text-xl font-bold text-ink-900">
                  {formatCurrency(subtotal - discount + shipping)}
                </span>
              </div>
            </div>

            {/* CTAs */}
            <Link to="/cart" onClick={onClose}
              className="block w-full text-center py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              style={{ color: 'rgba(26,27,42,0.7)', background: 'rgba(26,27,42,0.04)', border: '1px solid rgba(26,27,42,0.09)' }}>
              View Full Cart
            </Link>
            <Link to="/checkout" onClick={onClose}
              className="btn-luxe w-full justify-center py-3.5 text-sm">
              Checkout — {formatCurrency(subtotal - discount + shipping)}
            </Link>

            {/* Payment icons */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="text-[10px] font-medium text-neutral-300 uppercase tracking-wider">Pay with</span>
              {['COD', 'Easypaisa'].map(m => (
                <span key={m} className="text-[9px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(26,27,42,0.05)', color: 'rgba(26,27,42,0.4)' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
