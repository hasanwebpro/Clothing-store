import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', description: '', category: '', brand: '',
  base_price: '', sale_price: '',
  product_type: 'simple',
  is_published: false, is_featured: false,
  tags: '',
};
const EMPTY_VARIANT = { sku: '', size: '', color: '', stock: 0, price_override: '' };

// Flatten nested category tree into a flat list with indent level
function flattenCategories(cats, level = 0) {
  const out = [];
  for (const c of cats) {
    out.push({ ...c, level });
    if (c.children?.length) out.push(...flattenCategories(c.children, level + 1));
  }
  return out;
}

// Reusable field wrapper
function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8b9098' }}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
        {hint && <span className="normal-case font-normal ml-1.5" style={{ color: '#565a6a' }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// Section wrapper
function Section({ title, children }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef();

  const [form, setForm] = useState(EMPTY_FORM);
  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);
  const [saving, setSaving] = useState(false);

  // Images: existing (from server) + pending (local files not yet uploaded)
  const [existingImages, setExistingImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]); // [{ file, preview }]

  const { data: rawCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories().then(r => r.data?.results || r.data || []),
  });
  const categories = rawCategories ? flattenCategories(rawCategories) : [];

  const { data: existing } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: () => productsApi.getProductById(id).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      name:         existing.name || '',
      description:  existing.description || '',
      category:     existing.category?.id || '',
      brand:        existing.brand || '',
      base_price:   existing.base_price || '',
      sale_price:   existing.sale_price || '',
      product_type: existing.product_type || 'simple',
      is_published: existing.is_published || false,
      is_featured:  existing.is_featured || false,
      tags:         (existing.tags || []).join(', '),
    });
    if (existing.variants?.length) {
      setVariants(existing.variants.map(v => ({
        sku:            v.sku,
        price_override: v.price_override || '',
        size:  v.attribute_values?.find(a => a.attribute_name === 'Size')?.value  || '',
        color: v.attribute_values?.find(a => a.attribute_name === 'Color')?.value || '',
        stock: v.stock ?? 0,
      })));
    }
    if (existing.images?.length) setExistingImages(existing.images);
  }, [existing]);

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const setVariant = (i, k, v) => {
    setVariants(prev => { const n = [...prev]; n[i] = { ...n[i], [k]: v }; return n; });
  };

  // Pick images from disk — just add to pending, don't upload yet
  const handleImagePick = e => {
    const files = Array.from(e.target.files);
    const newPending = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPendingImages(prev => [...prev, ...newPending]);
    e.target.value = '';
  };

  const removePending = idx => {
    setPendingImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExisting = async imgId => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await productsApi.deleteImage(id, imgId);
      setExistingImages(prev => prev.filter(img => img.id !== imgId));
      toast.success('Image deleted');
    } catch {
      toast.error('Could not delete image');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.base_price || !form.category) {
      toast.error('Name, price, and category are required');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      base_price:  parseFloat(form.base_price),
      sale_price:  form.sale_price ? parseFloat(form.sale_price) : null,
      category:    parseInt(form.category),
      tags:        form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      variants: form.product_type === 'variable'
        ? variants.map(v => ({
            sku:            v.sku,
            price_override: v.price_override ? parseFloat(v.price_override) : null,
            attributes: [
              ...(v.size  ? [{ name: 'Size',  value: v.size  }] : []),
              ...(v.color ? [{ name: 'Color', value: v.color }] : []),
            ],
            stock: parseInt(v.stock) || 0,
          }))
        : [{ sku: `${form.name.replace(/\s+/g, '-').toLowerCase()}-001`, stock: parseInt(variants[0]?.stock) || 0 }],
    };

    try {
      let productId;
      if (isEdit) {
        await productsApi.updateProduct(id, payload);
        productId = id;
        toast.success('Product updated');
      } else {
        const res = await productsApi.createProduct(payload);
        productId = res.data.id;
        toast.success('Product created');
      }

      // Upload any pending images sequentially
      for (const { file } of pendingImages) {
        const fd = new FormData();
        fd.append('image', file);
        await productsApi.uploadImage(productId, fd);
      }

      navigate('/admin/products');
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.message || d?.name?.[0] || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle helper ──────────────────────────────────────────────────────────
  function Toggle({ checked, onChange, label, sub }) {
    return (
      <button type="button" onClick={() => onChange(!checked)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors"
        style={{ background: 'rgba(34,37,46,0.70)', border: `1px solid ${checked ? '#3b82f6' : '#3d424e'}` }}>
        <div className="text-left">
          <p className="text-sm font-medium text-white">{label}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#8b9098' }}>{sub}</p>}
        </div>
        <div className="relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ml-4"
          style={{ background: checked ? '#3b82f6' : '#3d424e', height: '22px', width: '42px' }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
            style={{ left: checked ? '22px' : '2px' }} />
        </div>
      </button>
    );
  }

  return (
    <div className="max-w-5xl space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/products')}
          className="flex items-center gap-1.5 text-sm cursor-pointer transition-colors"
          style={{ color: '#8b9098' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f1f2f4'}
          onMouseLeave={e => e.currentTarget.style.color = '#8b9098'}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Products
        </button>
        <svg className="w-3.5 h-3.5" style={{ color: '#3d424e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <h1 className="text-xl font-semibold text-white">
          {isEdit ? `Edit: ${existing?.name || '…'}` : 'New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT: main form (2/3) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic info */}
            <Section title="Basic Information">
              <Field label="Product Name" required>
                <input type="text" className="input-dark" placeholder="e.g. Floral Summer Dress"
                  value={form.name} onChange={set('name')} required />
              </Field>
              <Field label="Description" hint="optional">
                <textarea className="input-dark min-h-[100px] resize-y" placeholder="Describe the product…"
                  value={form.description} onChange={set('description')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Brand" hint="optional">
                  <input type="text" className="input-dark" placeholder="e.g. Khaadi"
                    value={form.brand} onChange={set('brand')} />
                </Field>
                <Field label="Tags" hint="comma separated">
                  <input type="text" className="input-dark" placeholder="summer, casual, lawn"
                    value={form.tags} onChange={set('tags')} />
                </Field>
              </div>
            </Section>

            {/* Pricing */}
            <Section title="Pricing">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Base Price (PKR)" required>
                  <input type="number" className="input-dark" placeholder="1299" min="0" step="0.01"
                    value={form.base_price} onChange={set('base_price')} required />
                </Field>
                <Field label="Sale Price (PKR)" hint="optional">
                  <input type="number" className="input-dark" placeholder="999" min="0" step="0.01"
                    value={form.sale_price} onChange={set('sale_price')} />
                </Field>
              </div>
              {form.sale_price && form.base_price && parseFloat(form.sale_price) < parseFloat(form.base_price) && (
                <p className="text-xs font-medium" style={{ color: '#10b981' }}>
                  {Math.round((1 - parseFloat(form.sale_price) / parseFloat(form.base_price)) * 100)}% discount will be shown to customers
                </p>
              )}
            </Section>

            {/* Product type & stock */}
            <Section title="Product Type & Stock">
              <div className="grid grid-cols-2 gap-3">
                {['simple', 'variable'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, product_type: t }))}
                    className="px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer text-left"
                    style={form.product_type === t
                      ? { background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#60a5fa' }
                      : { background: 'rgba(34,37,46,0.70)', border: '1px solid #3d424e', color: '#8b9098' }}>
                    <p className="font-semibold capitalize">{t}</p>
                    <p className="text-xs mt-0.5">{t === 'simple' ? 'One size, one stock' : 'Multiple sizes / colors'}</p>
                  </button>
                ))}
              </div>

              {form.product_type === 'simple' ? (
                <Field label="Stock Quantity">
                  <input type="number" className="input-dark" style={{ maxWidth: 180 }}
                    min="0" placeholder="0"
                    value={variants[0]?.stock || 0}
                    onChange={e => setVariant(0, 'stock', e.target.value)} />
                </Field>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b9098' }}>Variants</p>
                    <button type="button" onClick={() => setVariants(v => [...v, { ...EMPTY_VARIANT }])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Variant
                    </button>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className="rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3"
                      style={{ background: 'rgba(34,37,46,0.70)', border: '1px solid #3d424e' }}>
                      <div>
                        <label className="label-dark">SKU *</label>
                        <input type="text" className="input-dark py-1.5 text-xs" placeholder="DRESS-RED-M"
                          value={v.sku} onChange={e => setVariant(i, 'sku', e.target.value)} />
                      </div>
                      <div>
                        <label className="label-dark">Size</label>
                        <input type="text" className="input-dark py-1.5 text-xs" placeholder="S / M / L"
                          value={v.size} onChange={e => setVariant(i, 'size', e.target.value)} />
                      </div>
                      <div>
                        <label className="label-dark">Color</label>
                        <input type="text" className="input-dark py-1.5 text-xs" placeholder="Red"
                          value={v.color} onChange={e => setVariant(i, 'color', e.target.value)} />
                      </div>
                      <div>
                        <label className="label-dark">Stock</label>
                        <input type="number" className="input-dark py-1.5 text-xs" min="0"
                          value={v.stock} onChange={e => setVariant(i, 'stock', e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        {variants.length > 1 && (
                          <button type="button" onClick={() => setVariants(v => v.filter((_, j) => j !== i))}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors w-full"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Images */}
            <Section title="Product Images">
              <p className="text-xs" style={{ color: '#8b9098' }}>
                Images are uploaded when you save. First image becomes the primary photo.
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {/* Existing images */}
                {existingImages.map(img => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden"
                    style={{ background: 'rgba(34,37,46,0.70)', border: img.is_primary ? '2px solid #3b82f6' : '1px solid #3d424e' }}>
                    <img src={img.image_url} alt={img.alt_text} className="w-full h-full object-cover" />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                        Primary
                      </span>
                    )}
                    <button type="button" onClick={() => removeExisting(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.9)' }}>
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Pending (not yet uploaded) images */}
                {pendingImages.map((p, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden"
                    style={{ background: 'rgba(34,37,46,0.70)', border: '1px dashed #3d424e' }}>
                    <img src={p.preview} alt="preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 text-center px-1 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#f59e0b' }}>
                      Pending
                    </span>
                    <button type="button" onClick={() => removePending(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.9)' }}>
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Upload button */}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  style={{ background: 'rgba(34,37,46,0.70)', border: '1px dashed #3d424e' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#3d424e'}>
                  <svg className="w-6 h-6" style={{ color: '#565a6a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px]" style={{ color: '#565a6a' }}>Add Image</span>
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={handleImagePick} />
            </Section>
          </div>

          {/* ── RIGHT: sidebar (1/3) ── */}
          <div className="space-y-5">

            {/* Category */}
            <Section title="Category">
              <Field label="Select Category" required>
                <select className="input-dark" value={form.category} onChange={set('category')} required>
                  <option value="">Choose a category…</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {'  '.repeat(c.level)}{c.level > 0 ? '↳ ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-xs" style={{ color: '#565a6a' }}>
                Category determines where the product appears (Women's, Men's, etc.)
              </p>
            </Section>

            {/* Sections */}
            <Section title="Sections">
              <div className="space-y-2">
                <Toggle
                  checked={form.is_published}
                  onChange={v => setForm(f => ({ ...f, is_published: v }))}
                  label="Published"
                  sub="Visible to all customers"
                />
                <Toggle
                  checked={form.is_featured}
                  onChange={v => setForm(f => ({ ...f, is_featured: v }))}
                  label="Featured"
                  sub="Show on homepage featured section"
                />
              </div>
            </Section>

            {/* Save */}
            <div className="space-y-2">
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#3b82f6', color: '#fff' }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#2563eb'; }}
                onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : isEdit ? 'Save Changes' : 'Create Product'}
              </button>
              <button type="button" onClick={() => navigate('/admin/products')}
                className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ background: 'rgba(34,37,46,0.70)', color: '#8b9098', border: '1px solid #3d424e' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f1f2f4'; e.currentTarget.style.borderColor = '#4d5260'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b9098'; e.currentTarget.style.borderColor = '#3d424e'; }}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
