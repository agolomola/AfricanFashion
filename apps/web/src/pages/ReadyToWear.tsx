import { useEffect, useMemo, useState, type FormEvent, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, Heart, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useCurrency } from '../components/ui/CurrencyProvider';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: { url: string }[];
  designer: {
    businessName: string;
    country: string;
  };
  category: {
    id: string;
    name: string;
  };
  sizes: string[];
  isFeatured?: boolean;
}

const fallbackImage = (seed: string, width = 1200, height = 1600) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;

const handleImageFallback =
  (seed: string, width = 1200, height = 1600) =>
  (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    const fallback = fallbackImage(seed, width, height);
    if (target.src === fallback) return;
    target.src = fallback;
  };

const countryFlags: Record<string, string> = {
  Ghana: '🇬🇭',
  Nigeria: '🇳🇬',
  Kenya: '🇰🇪',
  Senegal: '🇸🇳',
  Ethiopia: '🇪🇹',
  Morocco: '🇲🇦',
  Mali: '🇲🇱',
  'South Africa': '🇿🇦',
  Tanzania: '🇹🇿',
};

export default function ReadyToWear() {
  const { formatFromUsd } = useCurrency();
  const initialFilters = {
    search: '',
    country: '',
    categoryId: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest' as 'newest' | 'price-low' | 'price-high',
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [categoriesRes, countriesRes] = await Promise.all([
          api.products.getCategories(),
          api.products.getCountries(),
        ]);
        if (categoriesRes.success) {
          setCategories(categoriesRes.data || []);
        }
        if (countriesRes.success) {
          setCountries(countriesRes.data || []);
        }
      } catch (loadError) {
        console.error('Failed to load RTW filters:', loadError);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await api.products.getReadyToWear({
          search: filters.search || undefined,
          country: filters.country || undefined,
          categoryId: filters.categoryId || undefined,
          page,
          limit: 24,
        });
        if (!response.success) {
          setProducts([]);
          setError('Unable to load ready-to-wear products right now.');
          return;
        }
        const rows = (response.data?.products || []).map((product: any) => {
          const inStockSizes = (product.sizeVariations || []).filter((size: any) => Number(size.stock || 0) > 0);
          const minPrice = inStockSizes.length > 0
            ? Math.min(...inStockSizes.map((size: any) => Number(size.price || product.basePrice || 0)))
            : Number(product.basePrice || 0);
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: minPrice,
            images: product.images || [],
            designer: {
              businessName: product.designer?.businessName || 'Unknown Designer',
              country: product.designer?.country || '',
            },
            category: {
              id: product.category?.id,
              name: product.category?.name || 'Ready To Wear',
            },
            sizes: (inStockSizes.length > 0 ? inStockSizes : product.sizeVariations || []).map((size: any) => size.size),
            isFeatured: Boolean(product.isFeatured),
          };
        });
        setProducts(rows);
        setPagination({
          page: response.data?.pagination?.page || 1,
          pages: response.data?.pagination?.pages || 1,
          total: response.data?.pagination?.total || 0,
        });
      } catch (loadError) {
        console.error('Failed to load ready-to-wear products:', loadError);
        setProducts([]);
        setError('Unable to load ready-to-wear products right now.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [filters, page, reloadToken]);

  const sortedProducts = useMemo(() => {
    const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;
    const hasMinPrice = Number.isFinite(minPrice) && minPrice !== null;
    const hasMaxPrice = Number.isFinite(maxPrice) && maxPrice !== null;

    let rows = [...products];
    if (hasMinPrice) {
      rows = rows.filter((product) => Number(product.price || 0) >= Number(minPrice));
    }
    if (hasMaxPrice) {
      rows = rows.filter((product) => Number(product.price || 0) <= Number(maxPrice));
    }

    if (filters.sortBy === 'price-low') {
      rows.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price-high') {
      rows.sort((a, b) => b.price - a.price);
    }
    return rows;
  }, [products, filters.minPrice, filters.maxPrice, filters.sortBy]);

  const applyFilters = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setFilters(draftFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setDraftFilters(initialFilters);
    setPage(1);
  };

  const activeFiltersCount = [
    draftFilters.search,
    draftFilters.country,
    draftFilters.categoryId,
    draftFilters.minPrice,
    draftFilters.maxPrice,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img
          src="/images/hero-readytowear.jpg"
          alt="Ready to Wear"
          onError={handleImageFallback('hero-ready-to-wear', 1920, 1080)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.5), transparent)' }} />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">Ready to Wear</h1>
              <p className="text-lg text-white text-opacity-80">Fashion-forward pieces ready to ship.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((previous) => ({ ...previous, search: e.target.value }))}
                placeholder="Search ready-to-wear..."
                className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent bg-white"
              />
            </div>

            <div className="relative">
              <select
                value={draftFilters.categoryId}
                onChange={(e) => setDraftFilters((previous) => ({ ...previous, categoryId: e.target.value }))}
                className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 focus:border-transparent bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={draftFilters.country}
                onChange={(e) => setDraftFilters((previous) => ({ ...previous, country: e.target.value }))}
                className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 focus:border-transparent bg-white"
              >
                <option value="">All Countries</option>
                {countries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={draftFilters.minPrice}
                  onChange={(e) => setDraftFilters((previous) => ({ ...previous, minPrice: e.target.value }))}
                  className="w-20 pl-5 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-coral-500"
                />
              </div>
              <span className="text-gray-400 text-sm">-</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={draftFilters.maxPrice}
                  onChange={(e) => setDraftFilters((previous) => ({ ...previous, maxPrice: e.target.value }))}
                  className="w-20 pl-5 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-coral-500"
                />
              </div>
            </div>

            <div className="relative">
              <select
                value={draftFilters.sortBy}
                onChange={(e) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    sortBy: e.target.value as 'newest' | 'price-low' | 'price-high',
                  }))
                }
                className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 bg-white"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low-High</option>
                <option value="price-high">Price: High-Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <Button type="submit" size="sm" className="h-[38px]">
              Apply Filters
            </Button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-xs text-coral-500 font-medium hover:bg-coral-50 rounded-lg transition-colors border border-coral-200"
              >
                Clear ({activeFiltersCount})
              </button>
            )}

            <div className="ml-auto text-xs text-gray-500">
              Showing {sortedProducts.length} of {pagination.total} products
            </div>
          </form>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-coral-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => setReloadToken((t) => t + 1)}>Retry</Button>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No ready-to-wear items found for your current filters.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sortedProducts.map((product) => (
                <Link key={product.id} to={`/ready-to-wear/${product.id}`} className="group">
                  <div className="bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                    <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                      <img
                        src={product.images?.[0]?.url || '/placeholder.jpg'}
                        alt={product.name}
                        onError={handleImageFallback(`ready-to-wear-${product.id}`)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {product.isFeatured && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="purple">Featured</Badge>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center z-10">
                        <span className="text-2xl shadow-lg">{countryFlags[product.designer?.country] || '🌍'}</span>
                      </div>
                      <button
                        className="absolute top-3 right-3 w-8 h-8 bg-white bg-opacity-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-500 hover:text-white"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{product.designer?.businessName}</p>
                      <p className="text-coral-500 font-semibold mt-2">{formatFromUsd(product.price)}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.sizes.slice(0, 4).map((size) => (
                          <span key={size} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {size}
                          </span>
                        ))}
                        {product.sizes.length > 4 && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">+{product.sizes.length - 4}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-3">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
