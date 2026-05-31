import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useCart } from '../../context/CartContext';

const SHIMMER = {
  background: 'linear-gradient(135deg,#ffffff 0%,#ffd6ec 40%,#ffffff 70%,#ffb3d9 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  animation: 'shimmer 4s linear infinite',
  filter: 'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 28px rgba(255,100,160,0.6))',
};

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const { refreshCart } = useCart();
  const order = state?.order;

  useEffect(() => { refreshCart?.(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">

      {/* Celebration banner */}
      <div className="relative overflow-hidden rounded-3xl p-10 mb-8 text-white"
        style={{ background: 'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-2" style={SHIMMER}>
            Order Placed!
          </h1>
          <p className="text-white/85 text-lg">
            Thank you for your purchase. We'll send you a confirmation shortly.
          </p>
        </div>
      </div>

      {/* Order details card */}
      {order && (
        <div className="luxe-card p-6 text-left mb-8 space-y-3" style={{ border: '1px solid rgba(26,27,42,0.07)' }}>
          <h2 className="font-display text-xl font-semibold text-neutral-900 mb-4">Order Summary</h2>
          {[
            { label: 'Order Number',      value: order.order_number, bold: true, mono: true },
            { label: 'Total Amount',       value: `PKR ${Number(order.total_amount).toLocaleString()}`, bold: true },
            { label: 'Payment Method',     value: order.payment_method?.replace('_',' '), capitalize: true },
            { label: 'Estimated Delivery', value: '3–5 business days' },
          ].map(({ label, value, bold, mono, capitalize }) => (
            <div key={label} className="flex justify-between text-sm py-2 border-b border-neutral-50 last:border-0">
              <span className="text-neutral-500">{label}</span>
              <span className={`${bold ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'} ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {order?.order_number && (
          <Link to={`/account/orders/${order.order_number}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)', boxShadow: '0 4px 20px rgba(236,110,173,0.4)' }}>
            Track My Order
          </Link>
        )}
        <Link to="/products" className="btn-secondary px-8 py-3.5">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
