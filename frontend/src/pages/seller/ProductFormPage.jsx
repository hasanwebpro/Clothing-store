import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', description: '', category: '', brand: '',
  base_price: '', sale_price: '', product_type: 'simple',
  is_published: false, is_featured: false,
  tags: '',
};

const EMPTY_VARIANT = { sku: '', price_override: '', size: '', color: '', stock: 0 };

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_FORM);
  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories().then((r) => r.data?.results || r.data || []),
  });

  // Edit form pulls the product by numeric ID (seller-only endpoint).
  const { data: existing } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: () => productsApi.getProductById(id).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        description: existing.description || '',
        category: existing.category?.id || '',
        brand: existing.brand || '',
        base_price: existing.base_price || '',
        sale_price: existing.sale_price || '',
        product_type: existing.product_type || 'simple',
        is_published: existing.is_published || false,
        is_featured: existing.is_featured || false,
        tags: (existing.tags || []).join(', '),
      });
      if (existing.variants?.length) {
        setVariants(existing.variants.map((v) => ({
          sku: v.sku,
          price_override: v.price_override || '',
          // Backend serializer exposes `attribute_values: [{attribute_name, value}]`
          size: v.attribute_values?.find((a) => a.attribute_name === 'Size')?.value || '',
          color: v.attribute_values?.find((a) => a.attribute_name === 'Color')?.value || '',
          stock: v.stock ?? 0,
        })));
      }
    }
  }, [existing]);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [key]: val });
  };

  const setVariant = (idx, key, val) => {
    const next = [...variants];
    next[idx] = { ...next[idx], [key]: val };
    setVariants(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.base_price || !form.category) {
      toast.error('Name, price, and category are required');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      base_price: parseFloat(form.base_price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      category: parseInt(form.category),
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      variants: form.product_type === 'variable' ? variants.map((v) => ({
        sku: v.sku,
        price_override: v.price_override ? parseFloat(v.price_override) : null,
        attributes: [
          ...(v.size ? [{ name: 'Size', value: v.size }] : []),
          ...(v.color ? [{ name: 'Color', value: v.color }] : []),
        ],
        stock: parseInt(v.stock) || 0,
      })) : [{
        sku: `${form.name.replace(/\s+/g, '-').toLowerCase()}-001`,
        stock: parseInt(variants[0]?.stock) || 0,
      }],
    };

    try {
      if (isEdit) {
        await productsApi.updateProduct(id, payload);
        toast.success('Product updated!');
      } else {
        await productsApi.createProduct(payload);
        toast.success('Product created!');
      }
      navigate('/seller/products');
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || data?.name?.[0] || 'Could not save product';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-neutral-900">
        {isEdit ? 'Edit Product' : 'New Product'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900">Basic Information</h2>
          <div>
            <label className="label">Product Name *</label>
            <input type="text" className="input" placeholder="e.g. Floral Summer Dress" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[100px] resize-y" placeholder="Describe the product…" value={form.description} onChange={set('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={set('category')} required>
                <option value="">Select category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <input type="text" className="input" placeholder="Brand name" value={form.brand} onChange={set('brand')} />
            </div>
          </div>
          <div>
            <label className="label">Tags <span className="text-neutral-400 font-normal">(comma separated)</span></label>
            <input type="text" className="input" placeholder="summer, casual, trending" value={form.tags} onChange={set('tags')} />
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Base Price (PKR) *</label>
              <input type="number" className="input" placeholder="1299" min="0" step="0.01" value={form.base_price} onChange={set('base_price')} required />
            </div>
            <div>
              <label className="label">Sale Price (PKR) <span className="text-neutral-400 font-normal">optional</span></label>
              <input type="number" className="input" placeholder="999" min="0" step="0.01" value={form.sale_price} onChange={set('sale_price')} />
            </div>
          </div>
        </div>

        {/* Product Type & Variants */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900">Product Type</h2>
          <div className="flex gap-4">
            {['simple', 'variable'].map((t) => (
              <label key={t} className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border-2 flex-1 justify-center ${
                form.product_type === t ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
              }`}>
                <input type="radio" name="product_type" value={t} checked={form.product_type === t} onChange={set('product_type')} />
                <span className="text-sm font-medium capitalize">{t}</span>
                <span className="text-xs text-neutral-400">{t === 'simple' ? '(no variants)' : '(size/color)'}</span>
              </label>
            ))}
          </div>

          {form.product_type === 'simple' ? (
            <div>
              <label className="label">Initial Stock Quantity</label>
              <input type="number" className="input max-w-[200px]" min="0" value={variants[0]?.stock || 0} onChange={(e) => setVariant(0, 'stock', e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Variants</p>
                <button
                  type="button"
                  onClick={() => setVariants([...variants, { ...EMPTY_VARIANT }])}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  + Add Variant
                </button>
              </div>
              {variants.map((v, i) => (
                <div key={i} className="border border-neutral-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="label text-xs">SKU *</label>
                    <input type="text" className="input py-1.5 text-xs" placeholder="SHIRT-BLK-M" value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Size</label>
                    <input type="text" className="input py-1.5 text-xs" placeholder="S, M, L, XL" value={v.size} onChange={(e) => setVariant(i, 'size', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Color</label>
                    <input type="text" className="input py-1.5 text-xs" placeholder="Red, Blue…" value={v.color} onChange={(e) => setVariant(i, 'color', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Stock</label>
                    <input type="number" className="input py-1.5 text-xs" min="0" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700 py-1.5 px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-neutral-900">Visibility</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-neutral-900" checked={form.is_published} onChange={set('is_published')} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Published</p>
              <p className="text-xs text-neutral-500">Visible to customers on the store</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-neutral-900" checked={form.is_featured} onChange={set('is_featured')} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Featured</p>
              <p className="text-xs text-neutral-500">Show on homepage featured section</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/seller/products')}
            className="btn-secondary px-8 py-3"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8 py-3 justify-center">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
