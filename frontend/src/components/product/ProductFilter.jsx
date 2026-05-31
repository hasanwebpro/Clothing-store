import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';

export default function ProductFilter({ searchParams, onFilterChange }) {
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories().then(r => r.data?.results || r.data || []),
  });

  const get = (key) => searchParams?.get(key) || '';

  const clear = () => {
    ['min_price', 'max_price', 'category', 'is_sale'].forEach(k => onFilterChange(k, ''));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900">Filters</h3>
        <button onClick={clear} className="text-xs text-brand-600 hover:underline cursor-pointer">Clear all</button>
      </div>

      {/* Category */}
      {categoriesData?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-neutral-700 mb-2">Category</p>
          <div className="space-y-1">
            {categoriesData.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value={cat.slug}
                  checked={get('category') === cat.slug}
                  onChange={(e) => onFilterChange('category', e.target.value)}
                  className="accent-brand-600"
                />
                <span className="text-sm text-neutral-600">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <p className="text-sm font-medium text-neutral-700 mb-2">Price Range (PKR)</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={get('min_price')}
            onChange={(e) => onFilterChange('min_price', e.target.value)}
            className="input text-sm w-full"
          />
          <input
            type="number"
            placeholder="Max"
            value={get('max_price')}
            onChange={(e) => onFilterChange('max_price', e.target.value)}
            className="input text-sm w-full"
          />
        </div>
      </div>

      {/* Sale */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={get('is_sale') === 'true'}
          onChange={(e) => onFilterChange('is_sale', e.target.checked ? 'true' : '')}
          className="accent-brand-600"
        />
        <span className="text-sm text-neutral-600">On Sale only</span>
      </label>
    </div>
  );
}
