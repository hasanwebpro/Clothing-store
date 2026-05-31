/**
 * ProductCard — Luxury product tile.
 *
 * UX moves
 * --------
 *  1. Quick Add CTA slides up from the bottom on hover
 *  2. Wishlist heart fades in top-right on hover
 *  3. Image scales gently on hover for tactile feedback
 *  4. Card lifts on hover with a soft depth shadow
 *
 * Accessibility
 * - All interactive controls have aria-labels
 * - Image has descriptive alt text
 * - Card is keyboard-navigable (the Link)
 */
import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

function formatCurrency(amount) {
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

function StarRating({ rating, count }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-luxe-500' : 'text-neutral-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {count > 0 && <span className="text-[11px] text-neutral-400 ml-0.5">({count})</span>}
    </div>
  );
}

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(product.is_wishlisted || false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const price = product.sale_price || product.base_price;
  const hasDiscount = product.sale_price && product.sale_price < product.base_price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.sale_price / product.base_price) * 100)
    : 0;

  const handleQuickAdd = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.product_type === 'variable') return;
    const firstVariant = product.variants?.[0];
    if (!firstVariant) {
      // Fallback: server will resolve the default variant
      try {
        setIsAdding(true);
        await addItem(product.id, 1);
        toast.success('Added to cart');
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not add to cart');
      } finally { setIsAdding(false); }
      return;
    }
    setIsAdding(true);
    try {
      await addItem(firstVariant.id, 1);
      toast.success('Added to cart');
    } catch (err) {
      if (!isAuthenticated) toast.error('Sign in to add items');
      else toast.error(err?.response?.data?.message || 'Could not add to cart');
    } finally { setIsAdding(false); }
  }, [addItem, product, isAuthenticated]);

  const handleWishlist = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Sign in to save items'); return; }
    setWishlistLoading(true);
    const prev = wishlisted;
    setWishlisted(!prev);
    try {
      if (prev) {
        await apiClient.delete(`/wishlist/${product.id}/`);
      } else {
        await apiClient.post('/wishlist/', { product_id: product.id });
      }
    } catch {
      setWishlisted(prev);
      toast.error('Could not update wishlist');
    } finally { setWishlistLoading(false); }
  }, [isAuthenticated, wishlisted, product.id]);

  return (
    <div className="group relative">
      <Link
        to={`/products/${product.slug}`}
        aria-label={`View ${product.name} — ${formatCurrency(price)}`}
        className="block luxe-card overflow-hidden"
      >
        {/* ── Image container ───────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-ink-50 to-brand-50 aspect-[3/4]">
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Gradient frame for depth */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40 rounded-[inherit]" />

          {/* Badges (discount / featured / new) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5" aria-hidden="true">
            {hasDiscount && (
              <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full shadow-lg">
                -{discountPct}% OFF
              </span>
            )}
            {product.is_featured && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-luxe-500 to-luxe-600 text-ink-900 text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full shadow-lg">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                FEATURED
              </span>
            )}
            {product.is_new && (
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full shadow-lg">
                NEW IN
              </span>
            )}
          </div>

          {/* Wishlist heart */}
          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md
              ${wishlisted
                ? 'bg-rose-50/95 text-rose-500 ring-1 ring-rose-200 scale-100'
                : 'bg-white/70 text-neutral-500 hover:text-rose-500 hover:bg-white opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
              }`}
          >
            <svg
              className={`w-4 h-4 transition-all ${wishlisted ? 'animate-heartbeat' : ''}`}
              fill={wishlisted ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Quick Add — slides up on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={handleQuickAdd}
              disabled={isAdding}
              aria-label={product.product_type === 'variable' ? 'Select options' : 'Quick add to cart'}
              className="relative w-full overflow-hidden rounded-xl bg-ink-900 text-white text-xs font-bold tracking-wider uppercase py-3 shadow-luxe-lg
                         hover:bg-ink-800 transition-colors duration-200"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-luxe-400/20 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                {product.product_type === 'variable' ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Select Options
                  </>
                ) : isAdding ? (
                  'Adding…'
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Quick Add
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* ── Info section ───────────────────────────────────────────── */}
        <div className="p-4 space-y-1.5">
          {product.category_name && (
            <p className="text-[10px] text-luxe-600 uppercase tracking-[0.18em] font-bold">
              {product.category_name}
            </p>
          )}
          <h3 className="text-sm font-semibold text-ink-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-bold text-ink-900">{formatCurrency(price)}</span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">
                {formatCurrency(product.base_price)}
              </span>
            )}
          </div>
          {hasDiscount && (
            <p className="text-[11px] text-emerald-600 font-semibold">
              You save {formatCurrency(product.base_price - product.sale_price)}
            </p>
          )}

          {/* Rating */}
          {product.review_count > 0 && (
            <div className="pt-1">
              <StarRating rating={product.average_rating} count={product.review_count} />
            </div>
          )}

          {/* Color swatches */}
          {product.available_colors?.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1" aria-label={`${product.available_colors.length} colors available`}>
              {product.available_colors.slice(0, 5).map((color, i) => (
                <span
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-neutral-200 shadow-sm ring-1 ring-white"
                  style={{ backgroundColor: color.toLowerCase() }}
                  title={color}
                />
              ))}
              {product.available_colors.length > 5 && (
                <span className="text-[10px] text-neutral-400">+{product.available_colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
