import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../../api/auth.api';
import { PROVINCES, CITIES_BY_PROVINCE, ALL_CITIES, ADDRESS_LABELS } from '../../../data/pakistan';
import { IconHome, IconBuilding, IconMapPin, IconFlag } from '../../../components/ui/Icons';
import toast from 'react-hot-toast';

const EMPTY = { label: 'Home', street: '', city: '', province: '', postal_code: '', is_default: false };

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

function AddressForm({ initial, onCancel, onSave, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => {
      const next = { ...prev, [k]: val };
      // Reset city when province changes
      if (k === 'province') next.city = '';
      return next;
    });
    setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const cityOptions = form.province ? (CITIES_BY_PROVINCE[form.province] || []) : ALL_CITIES;

  const validate = () => {
    const e = {};
    if (!form.street.trim()) e.street = 'Street address is required';
    if (!form.city) e.city = 'City is required';
    if (!form.province) e.province = 'Province is required';
    if (form.postal_code && !/^\d{4,6}$/.test(form.postal_code))
      e.postal_code = 'Enter a valid 4–6 digit postal code';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, country: 'Pakistan' });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-5 space-y-5">

      {/* Label pills */}
      <div>
        <label className="label mb-2">Address label</label>
        <div className="flex gap-2 flex-wrap">
          {ADDRESS_LABELS.map(l => (
            <label key={l}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium select-none"
              style={form.label === l
                ? { borderColor: '#ff006e', background: 'rgba(255,0,110,0.05)', color: '#ff006e' }
                : { borderColor: 'rgba(26,27,42,0.12)', color: '#6b7280' }}>
              <input type="radio" name="addr_label" value={l} checked={form.label === l}
                onChange={() => setForm(p => ({ ...p, label: l }))}
                className="sr-only" />
              {l === 'Home' && <IconHome className="w-3.5 h-3.5" />}
              {l === 'Office' && <IconBuilding className="w-3.5 h-3.5" />}
              {l === 'Other' && <IconMapPin className="w-3.5 h-3.5" />}
              {l}
            </label>
          ))}
        </div>
      </div>

      {/* Street */}
      <div>
        <label className="label">Street address <span className="text-red-400">*</span></label>
        <input
          className={`input ${errors.street ? 'border-red-400 focus:border-red-400' : ''}`}
          value={form.street}
          onChange={set('street')}
          placeholder="House #, street name, area/block"
          autoComplete="street-address"
        />
        <FieldError msg={errors.street} />
      </div>

      {/* Province + City */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Province <span className="text-red-400">*</span></label>
          <select
            className={`input ${errors.province ? 'border-red-400 focus:border-red-400' : ''}`}
            value={form.province}
            onChange={set('province')}
          >
            <option value="">Select province…</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <FieldError msg={errors.province} />
        </div>

        <div>
          <label className="label">City <span className="text-red-400">*</span></label>
          <select
            className={`input ${errors.city ? 'border-red-400 focus:border-red-400' : ''}`}
            value={form.city}
            onChange={set('city')}
            disabled={cityOptions.length === 0}
          >
            <option value="">
              {form.province ? `Select city in ${form.province}…` : 'Select province first…'}
            </option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <FieldError msg={errors.city} />
        </div>
      </div>

      {/* Postal + Country */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Postal code</label>
          <input
            type="text" inputMode="numeric" maxLength={6}
            className={`input ${errors.postal_code ? 'border-red-400 focus:border-red-400' : ''}`}
            value={form.postal_code}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '');
              setForm(p => ({ ...p, postal_code: v }));
              setErrors(p => ({ ...p, postal_code: undefined }));
            }}
            placeholder="e.g. 54000"
          />
          <FieldError msg={errors.postal_code} />
        </div>
        <div>
          <label className="label">Country</label>
          <div className="input bg-neutral-50 text-neutral-500 cursor-not-allowed select-none flex items-center gap-2">
            <IconFlag className="w-4 h-4 flex-shrink-0" /> Pakistan
          </div>
        </div>
      </div>

      {/* Default checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0">
          <input type="checkbox" checked={form.is_default} onChange={set('is_default')}
            className="sr-only peer" />
          <div className="w-5 h-5 rounded border-2 transition-all peer-checked:bg-brand-500 peer-checked:border-brand-500 flex items-center justify-center"
            style={{ borderColor: form.is_default ? '#ff006e' : 'rgba(26,27,42,0.2)', background: form.is_default ? '#ff006e' : 'white' }}>
            {form.is_default && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-neutral-700 group-hover:text-neutral-900 transition-colors">
          Set as default delivery address
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary py-2.5 px-5">Cancel</button>
        <button type="submit" disabled={isSaving} className="btn-primary py-2.5 px-5 flex-1 justify-center">
          {isSaving
            ? <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving…
              </span>
            : 'Save Address'
          }
        </button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => authApi.getAddresses().then(r => r.data?.results || r.data || []),
  });

  const invalidate = () => qc.invalidateQueries(['addresses']);

  const apiErr = (err, fallback) =>
    err?.response?.data?.message || err?.response?.data?.detail ||
    (typeof err?.response?.data === 'string' ? err.response.data : null) || fallback;

  const createMut = useMutation({
    mutationFn: (data) => authApi.createAddress(data),
    onSuccess: () => { toast.success('Address added'); setEditing(null); invalidate(); },
    onError: (err) => toast.error(apiErr(err, 'Could not save address')),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => authApi.updateAddress(id, data),
    onSuccess: () => { toast.success('Address updated'); setEditing(null); invalidate(); },
    onError: (err) => toast.error(apiErr(err, 'Could not update address')),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => authApi.deleteAddress(id),
    onSuccess: () => { toast.success('Address removed'); invalidate(); },
    onError: (err) => toast.error(apiErr(err, 'Could not remove address')),
  });

  const isSaving = createMut.isLoading || updateMut.isLoading;
  const handleSave = (form) => {
    if (editing === 'new') createMut.mutate(form);
    else updateMut.mutate({ id: editing.id, data: form });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl md:text-4xl font-bold"
          style={{ background: 'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 4s linear infinite', filter: 'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>
          Addresses
        </h1>
        {!editing && (
          <button onClick={() => setEditing('new')} className="btn-primary py-2 px-4 text-sm">
            + Add Address
          </button>
        )}
      </div>

      {editing && (
        <AddressForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !addresses?.length && !editing ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <IconMapPin className="w-9 h-9 text-neutral-400" />
          </div>
          <h2 className="font-display font-bold mb-2 text-xl text-neutral-900">No saved addresses</h2>
          <p className="text-neutral-500 mb-6">Add an address to speed up checkout.</p>
          <button onClick={() => setEditing('new')} className="btn-primary px-8 py-3">Add Your First Address</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses?.map((a) => (
            <div key={a.id} className="card p-4 relative">
              {a.is_default && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                  Default
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,0,110,0.07)' }}>
                {a.label === 'Home'
                  ? <IconHome className="w-4 h-4 text-brand-600" />
                  : a.label === 'Office'
                  ? <IconBuilding className="w-4 h-4 text-brand-600" />
                  : <IconMapPin className="w-4 h-4 text-brand-600" />}
              </span>
                <span className="font-semibold text-neutral-900 text-sm">{a.label || 'Address'}</span>
              </div>
              <p className="text-sm text-neutral-600">{a.street}</p>
              <p className="text-sm text-neutral-600">
                {a.city}{a.province ? `, ${a.province}` : ''}{a.postal_code ? ` ${a.postal_code}` : ''}
              </p>
              <p className="text-sm text-neutral-400 flex items-center gap-1.5">
                <IconFlag className="w-3.5 h-3.5" /> Pakistan
              </p>
              <div className="flex gap-3 mt-3 pt-3 border-t border-neutral-100">
                <button onClick={() => setEditing(a)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                  Edit
                </button>
                <button
                  onClick={() => { if (window.confirm('Remove this address?')) deleteMut.mutate(a.id); }}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
