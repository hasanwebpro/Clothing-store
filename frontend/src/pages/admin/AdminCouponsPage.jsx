import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

const couponsApi = {
  getCoupons:   ()         => apiClient.get('/pricing/coupons/'),
  createCoupon: (data)     => apiClient.post('/pricing/coupons/', data),
  updateCoupon: (id, data) => apiClient.patch(`/pricing/coupons/${id}/`, data),
  deleteCoupon: (id)       => apiClient.delete(`/pricing/coupons/${id}/`),
};

const EMPTY = {
  code: '', type: 'percentage', value: '', min_order_value: '', max_uses: '',
  valid_from: '', valid_until: '', is_active: true,
};

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label-dark">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponsApi.getCoupons().then((r) => r.data?.results || r.data || []),
  });

  const createMutation = useMutation({
    mutationFn: (d) => couponsApi.createCoupon(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-coupons']);
      toast.success('Coupon created');
      setShowForm(false);
      setForm(EMPTY);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not create coupon'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => couponsApi.updateCoupon(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['admin-coupons']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couponsApi.deleteCoupon(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-coupons']); toast.success('Coupon deleted'); },
    onError: (err) => toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Could not delete coupon'),
  });

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [key]: val });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.code || !form.value || !form.valid_from || !form.valid_until) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate({
      ...form,
      value:           parseFloat(form.value),
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      max_uses:        form.max_uses ? parseInt(form.max_uses) : null,
    });
  };

  const isExpired = (v) => new Date(v) < new Date();

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Coupons</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b9098' }}>Create and manage discount codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
          style={showForm
            ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }
            : { background: '#3b82f6', color: '#fff', border: '1px solid transparent' }}
          onMouseEnter={e => { if (!showForm) e.currentTarget.style.background = '#2563eb'; }}
          onMouseLeave={e => { if (!showForm) e.currentTarget.style.background = '#3b82f6'; }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {showForm
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            }
          </svg>
          {showForm ? 'Cancel' : 'New Coupon'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl p-6 animate-fade-in-up" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
          <h2 className="font-semibold text-white mb-1">Create New Coupon</h2>
          <p className="text-xs mb-5" style={{ color: '#8b9098' }}>Fields marked * are required</p>

          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">

            <Field label="Code" required>
              <input type="text" className="input-dark uppercase" placeholder="SUMMER20"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                required />
            </Field>

            <Field label="Type" required>
              <select className="input-dark cursor-pointer" value={form.type} onChange={set('type')}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (PKR)</option>
              </select>
            </Field>

            <Field label="Value" required>
              <input type="number" className="input-dark"
                placeholder={form.type === 'percentage' ? '20' : '200'}
                min="0" step="0.01"
                value={form.value} onChange={set('value')} required />
            </Field>

            <Field label="Min Order (PKR)">
              <input type="number" className="input-dark" placeholder="1000" min="0"
                value={form.min_order_value} onChange={set('min_order_value')} />
            </Field>

            <Field label="Max Uses">
              <input type="number" className="input-dark" placeholder="Unlimited" min="1"
                value={form.max_uses} onChange={set('max_uses')} />
            </Field>

            {/* Toggle */}
            <div className="flex items-end">
              <button type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                style={{ background: 'rgba(34,37,46,0.70)', border: '1px solid #3d424e' }}>
                <span className="text-sm font-medium" style={{ color: form.is_active ? '#10b981' : '#8b9098' }}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: form.is_active ? '#10b981' : '#3d424e' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: form.is_active ? '18px' : '2px' }} />
                </div>
              </button>
            </div>

            <Field label="Valid From" required>
              <input type="datetime-local" className="input-dark"
                value={form.valid_from} onChange={set('valid_from')} required />
            </Field>

            <Field label="Valid Until" required>
              <input type="datetime-local" className="input-dark"
                value={form.valid_until} onChange={set('valid_until')} required />
            </Field>

            <div className="flex items-end">
              <button type="submit" disabled={createMutation.isLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50"
                style={{ background: '#3b82f6', color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                {createMutation.isLoading ? 'Creating…' : 'Create Coupon'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !data?.length && (
        <div className="text-center py-20 rounded-xl" style={{ background: 'rgba(28,31,38,0.65)', border: '1px dashed #2d3139' }}>
          <p className="font-semibold text-sm" style={{ color: '#565a6a' }}>No coupons yet</p>
          <p className="text-xs mt-1" style={{ color: '#3d424e' }}>Create your first discount code above</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && data?.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(34,37,46,0.70)' }}>
              <tr>
                {[
                  { label: 'Code',     cls: '' },
                  { label: 'Discount', cls: '' },
                  { label: 'Usage',    cls: 'hidden md:table-cell' },
                  { label: 'Expires',  cls: 'hidden md:table-cell' },
                  { label: 'Status',   cls: '' },
                  { label: '',         cls: '' },
                ].map((h, i) => (
                  <th key={i} className={`text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider ${h.cls}`}
                    style={{ color: '#8b9098', borderBottom: '1px solid #2d3139' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((coupon) => {
                const expired = isExpired(coupon.valid_until);
                const active  = coupon.is_active && !expired;
                return (
                  <tr key={coupon.id}
                    className="hover:bg-[#22252e] transition-colors"
                    style={{ borderTop: '1px solid #2d3139', opacity: expired ? 0.6 : 1 }}>

                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', letterSpacing: '0.1em' }}>
                        {coupon.code}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-semibold tabular-nums text-white">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `PKR ${Number(coupon.value).toLocaleString()}`}
                      </span>
                      {Number(coupon.min_order_value) > 0 && (
                        <span className="text-[10px] ml-1.5" style={{ color: '#8b9098' }}>
                          min PKR {Number(coupon.min_order_value).toLocaleString()}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm tabular-nums" style={{ color: '#d1d5db' }}>
                        {coupon.used_count}
                        <span style={{ color: '#565a6a' }}> / {coupon.max_uses ?? '∞'}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 hidden md:table-cell text-sm tabular-nums"
                      style={{ color: expired ? '#ef4444' : '#8b9098' }}>
                      {new Date(coupon.valid_until).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {expired && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          expired
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border"
                        style={active
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }
                          : expired
                          ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }
                          : { background: 'rgba(34,37,46,0.70)', color: '#8b9098', borderColor: '#3d424e' }}>
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: active ? '#10b981' : expired ? '#ef4444' : '#565a6a' }} />
                        {active ? 'Active' : expired ? 'Expired' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          style={coupon.is_active
                            ? { background: 'rgba(34,37,46,0.70)', color: '#f59e0b', border: '1px solid #2d3139' }
                            : { background: 'rgba(34,37,46,0.70)', color: '#10b981', border: '1px solid #2d3139' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#4d5260'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3139'}>
                          {coupon.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Delete "${coupon.code}"?`)) deleteMutation.mutate(coupon.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          style={{ background: 'rgba(34,37,46,0.70)', color: '#ef4444', border: '1px solid #2d3139' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3139'}>
                          Delete
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
