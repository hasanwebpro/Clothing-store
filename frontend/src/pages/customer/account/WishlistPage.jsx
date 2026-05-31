import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../../api/client';
import { useCart } from '../../../context/CartContext';
import toast from 'react-hot-toast';

const wishlistApi = {
  getWishlist: () => apiClient.get('/wishlist/'),
  removeFromWishlist: (productId) => apiClient.delete(`/wishlist/${productId}/`),
};

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const { addItem } = useCart();

  const { data: items, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getWishlist().then((r) => r.data?.results || r.data || []),
  });

  const removeMutation = useMutation({
    mutationFn: (productId) => wishlistApi.removeFromWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist']);
      toast.success('Removed from wishlist');
    },
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => <div key={i} className="aspect-[3/4] bg-neutral-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!items?.length) return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h2 className="font-display font-bold mb-2" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>Your wishlist is empty</h2>
      <p className="text-neutral-500 mb-6">Save items you love for later</p>
      <Link to="/products" className="btn-primary px-8 py-3">Browse Products</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl md:text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>My Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const product = item.product || item;
          return (
            <div key={product.id} className="card overflow-hidden group">
              <div className="relative aspect-[3/4] bg-neutral-50 overflow-hidden">
                {product.primary_image ? (
                  <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-200">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <button
                  onClick={() => removeMutation.mutate(product.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-red-400 hover:text-red-600 transition-colors text-sm"
                >
                  ×
                </button>
              </div>
              <div className="p-3">
                <Link to={`/products/${product.slug}`} className="font-medium text-neutral-900 text-sm hover:text-brand-600 line-clamp-1">
                  {product.name}
                </Link>
                <p className="text-sm font-bold text-neutral-900 mt-1">
                  PKR {Number(product.sale_price || product.base_price).toLocaleString()}
                </p>
                <button
                  onClick={() => toast('Visit product page to add to cart', { icon: 'ℹ️' })}
                  className="btn-primary w-full py-2 text-xs mt-2 justify-center"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
