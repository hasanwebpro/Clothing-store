import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useSEO } from '../../hooks/useSEO';
import ProductReviews from '../../components/product/ProductReviews';
import { Skeleton } from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

const SHIMMER = {
  background: 'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  animation: 'shimmer 4s linear infinite',
  filter: 'drop-shadow(0 0 8px rgba(236,110,173,0.4))',
};

function Stars({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-amber-400' : 'text-neutral-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-sm text-neutral-500 ml-0.5">({count} reviews)</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getProductBySlug(slug).then(r => r.data),
  });

  useSEO({
    title: product?.name,
    description: product?.description?.slice(0, 155) || `Buy ${product?.name} at VOGUE. PKR ${Number(product?.sale_price || product?.base_price).toLocaleString()}. Free delivery on orders over PKR 2,000.`,
    image: product?.primary_image,
    type: 'product',
  });

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_,i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        </div>
        <div className="space-y-5 pt-4">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-9 w-3/4 rounded-xl" />
          <div className="flex gap-1">{[...Array(5)].map((_,i) => <Skeleton key={i} className="w-4 h-4 rounded" />)}</div>
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <div className="flex gap-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-10 w-16 rounded-xl" />)}</div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-14 rounded-xl" />
            <Skeleton className="flex-1 h-14 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );

  if (isError || !product) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <p className="text-neutral-500 mb-4">Product not found.</p>
      <Link to="/products" className="btn-primary inline-flex">Browse All Products</Link>
    </div>
  );

  const images = product.images || [];
  const variants = product.variants || [];
  const activeVariant = selectedVariant || variants[0];
  const price = activeVariant?.price ?? product.sale_price ?? product.base_price;
  const originalPrice = product.base_price;
  const hasDiscount = product.sale_price && product.sale_price < product.base_price;
  const discountPct = hasDiscount ? Math.round((1 - product.sale_price / product.base_price) * 100) : 0;
  const stock = activeVariant?.stock ?? (variants.length === 0 ? 0 : 10);

  // Group variants by attribute — API returns `attribute_values`, not `attributes`
  const attributeMap = {};
  variants.forEach(v => {
    (v.attribute_values || []).forEach(({ attribute_name, value }) => {
      if (!attributeMap[attribute_name]) attributeMap[attribute_name] = new Set();
      attributeMap[attribute_name].add(value);
    });
  });

  const requiresAuth = (cb) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to continue');
      navigate('/login', { state: { from: { pathname: `/products/${slug}` } } });
      return false;
    }
    return cb();
  };

  const handleAddToCart = async () => requiresAuth(async () => {
    if (!activeVariant) { toast.error('Please select options'); return; }
    if (stock === 0) { toast.error('Out of stock'); return; }
    setAddingToCart(true);
    try {
      await addItem(activeVariant.id, quantity);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart');
    } finally { setAddingToCart(false); }
  });

  const handleBuyNow = async () => requiresAuth(async () => {
    if (!activeVariant) { toast.error('Please select options'); return; }
    if (stock === 0) { toast.error('Out of stock'); return; }
    setBuyingNow(true);
    try {
      await addItem(activeVariant.id, quantity);
      navigate('/checkout');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not proceed');
      setBuyingNow(false);
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-400 mb-6 flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-brand-600 transition-colors">Products</Link>
        {product.category && (<>
          <span>/</span>
          <Link to={`/category/${product.category.slug}`} className="hover:text-brand-600 transition-colors capitalize">{product.category.name}</Link>
        </>)}
        <span>/</span>
        <span className="text-neutral-700 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

        {/* ── Images ────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="aspect-square bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 relative group">
            {images[activeImg] ? (
              <img src={images[activeImg].image_url} alt={images[activeImg].alt_text || product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : product.primary_image ? (
              <img src={product.primary_image} alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-200">
                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                -{discountPct}% OFF
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? 'border-brand-500 ring-2 ring-brand-200' : 'border-transparent hover:border-neutral-300'}`}>
                  <img src={img.image_url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ──────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Brand + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.brand && <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">{product.brand}</span>}
            {product.is_featured && <span className="badge badge-violet">Featured</span>}
            {hasDiscount && <span className="badge badge-danger">-{discountPct}% Sale</span>}
            {stock > 0 && stock <= 5 && <span className="badge badge-warning">Only {stock} left</span>}
          </div>

          {/* Product name */}
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight tracking-tight" style={SHIMMER}>
            {product.name}
          </h1>

          {/* Rating */}
          {product.review_count > 0 && (
            <Stars rating={product.average_rating} count={product.review_count} />
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-neutral-900 tabular-nums">
              PKR {Number(price).toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-lg text-neutral-400 line-through tabular-nums">
                PKR {Number(originalPrice).toLocaleString()}
              </span>
            )}
            {hasDiscount && (
              <span className="text-sm font-semibold text-emerald-600">
                You save PKR {Number(originalPrice - price).toLocaleString()}
              </span>
            )}
          </div>

          {/* Variant selectors */}
          {Object.entries(attributeMap).map(([attrName, values]) => (
            <div key={attrName}>
              <p className="text-sm font-semibold text-neutral-700 mb-2.5">{attrName}</p>
              <div className="flex flex-wrap gap-2">
                {[...values].map(val => {
                  const matched = variants.find(v => v.attribute_values?.some(a => a.attribute_name === attrName && a.value === val));
                  const isSelected = activeVariant?.id === matched?.id;
                  const oos = (matched?.stock ?? 10) === 0;
                  return (
                    <button key={val} onClick={() => !oos && setSelectedVariant(matched)} disabled={oos}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
                        isSelected ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-glow-pink-sm'
                        : oos ? 'border-neutral-100 text-neutral-300 cursor-not-allowed line-through'
                        : 'border-neutral-200 text-neutral-700 hover:border-brand-300 hover:text-brand-600'
                      }`}>
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div>
            <p className="text-sm font-semibold text-neutral-700 mb-2.5">Quantity</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-xl border-2 border-neutral-200 overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 flex items-center justify-center text-lg hover:bg-neutral-50 transition-colors cursor-pointer font-bold text-neutral-600">
                  −
                </button>
                <span className="w-12 text-center font-bold text-neutral-900 tabular-nums">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(Math.max(stock, 1), quantity + 1))}
                  disabled={quantity >= stock && stock > 0}
                  className="w-11 h-11 flex items-center justify-center text-lg hover:bg-neutral-50 transition-colors cursor-pointer font-bold text-neutral-600 disabled:opacity-30">
                  +
                </button>
              </div>
              {stock === 0 && <span className="text-sm text-red-500 font-medium">Out of stock</span>}
              {stock > 0 && stock <= 5 && <span className="text-sm text-amber-600 font-medium">Only {stock} left in stock!</span>}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 pt-1">
            {/* Add to cart */}
            <button onClick={handleAddToCart} disabled={addingToCart || stock === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold tracking-wide text-white transition-all disabled:opacity-50 cursor-pointer"
              style={{ background:'linear-gradient(135deg,#EC6EAD,#7b5ea7)', boxShadow:'0 4px 20px rgba(236,110,173,0.35)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow='0 8px 32px rgba(236,110,173,0.55)'; }}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(236,110,173,0.35)'}>
              {addingToCart ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Adding…</>
              ) : stock === 0 ? 'Out of Stock' : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>Add to Cart</>
              )}
            </button>

            {/* Buy now */}
            <button onClick={handleBuyNow} disabled={buyingNow || stock === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold tracking-wide transition-all disabled:opacity-50 cursor-pointer"
              style={{ background:'rgba(236,110,173,0.08)', color:'#c0005a', border:'2px solid rgba(236,110,173,0.3)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background='rgba(236,110,173,0.15)'; e.currentTarget.style.borderColor='rgba(236,110,173,0.6)'; }}}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(236,110,173,0.08)'; e.currentTarget.style.borderColor='rgba(236,110,173,0.3)'; }}>
              {buyingNow ? 'Please wait…' : 'Buy Now'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="border-t border-neutral-100 pt-5 grid grid-cols-2 gap-3 text-sm text-neutral-600">
            {[
              { icon: '🚚', text: 'Free delivery over PKR 2,000' },
              { icon: '↩', text: '30-day easy returns' },
              { icon: '🔒', text: 'Secure payment' },
              { icon: '✓', text: 'Authentic products' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t border-neutral-100 pt-5">
              <h3 className="font-semibold text-neutral-900 mb-2">Product Details</h3>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16 border-t border-neutral-100 pt-12">
        <ProductReviews productId={product.id} averageRating={product.average_rating} reviewCount={product.review_count} />
      </div>
    </div>
  );
}
