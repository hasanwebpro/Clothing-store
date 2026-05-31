import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../../api/orders.api';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_COLORS = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  processing: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-danger',
  refunded: 'badge-neutral',
};

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => ordersApi.getOrder(orderNumber).then((r) => r.data),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(order.id),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries(['order', orderNumber]);
      queryClient.invalidateQueries(['orders']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not cancel order'),
  });

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!order) return (
    <div className="text-center py-16">
      <p className="text-neutral-500">Order not found.</p>
      <Link to="/account/orders" className="btn-primary mt-4 inline-flex">Back to Orders</Link>
    </div>
  );

  const isCancellable = ['pending', 'confirmed'].includes(order.status);
  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>{order.order_number}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-PK', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${STATUS_COLORS[order.status] || 'badge-neutral'} capitalize`}>{order.status}</span>
          {isCancellable && (
            <button
              onClick={() => { if (window.confirm('Cancel this order?')) cancelMutation.mutate(); }}
              className="btn-danger text-xs py-1.5 px-3"
              disabled={cancelMutation.isLoading}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="card p-6">
          <h2 className="font-semibold text-neutral-900 mb-6 text-sm">Order Progress</h2>
          <div className="flex items-center">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= currentStep ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-400'
                  }`}>
                    {i < currentStep ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs mt-2 capitalize text-center ${i <= currentStep ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                    {s}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-neutral-900 text-sm">Items Ordered</h2>
        {order.items?.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-14 h-14 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 text-sm truncate">{item.product_name}</p>
              <p className="text-xs text-neutral-500">SKU: {item.sku} · Qty: {item.quantity}</p>
            </div>
            <p className="font-bold text-neutral-900 text-sm">PKR {Number(item.total_price).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-2 text-sm">
          <h2 className="font-semibold text-neutral-900">Delivery Address</h2>
          {order.shipping_address && (
            <div className="text-neutral-600">
              <p>{order.shipping_address.street}</p>
              <p>{order.shipping_address.city}{order.shipping_address.province ? `, ${order.shipping_address.province}` : ''}</p>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-2 text-sm">
          <h2 className="font-semibold text-neutral-900">Payment Summary</h2>
          <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>PKR {Number(order.subtotal).toLocaleString()}</span></div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-green-600"><span>Discount</span><span>−PKR {Number(order.discount_amount).toLocaleString()}</span></div>
          )}
          <div className="flex justify-between text-neutral-600"><span>Shipping</span><span>{Number(order.shipping_cost) === 0 ? 'Free' : `PKR ${Number(order.shipping_cost).toLocaleString()}`}</span></div>
          <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-100 pt-2">
            <span>Total</span>
            <span>PKR {Number(order.total_amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Payment</span>
            <span className="capitalize">{order.payment_method?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <Link to="/account/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium block">← Back to Orders</Link>
    </div>
  );
}
