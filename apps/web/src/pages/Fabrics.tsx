import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useCurrency } from '../components/ui/CurrencyProvider';

interface FabricCard {
  id: string;
  name: string;
  description: string;
  pricePerMeter: number;
  images: { url: string }[];
  seller: {
    businessName: string;
    country: string;
  };
  materialType: {
    id: string;
    name: string;
  };
  isFeatured?: boolean;
}

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

export default function Fabrics() {
  const { formatFromUsd } = useCurrency();
  const initialFilters = {
    search: '',
    country: '',
    materialTypeId: '',
    sortBy: 'newest' as 'newest' | 'price-low' | 'price-high',
  };
  const [fabrics, setFabrics] = useState<FabricCard[]>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; name: string }>>([]);
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
        const [materialsRes, countriesRes] = await Promise.all([
          api.products.getMaterials(),
          api.products.getCountries(),
        ]);
        if (materialsRes.success) {
          setMaterials(materialsRes.data || []);
        }
        if (countriesRes.success) {
          setCountries(countriesRes.data || []);
        }
      } catch (loadError) {
        console.error('Failed to load fabrics filters:', loadError);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await api.products.getFabrics({
          search: filters.search || undefined,
          country: filters.country || undefined,
          materialTypeId: filters.materialTypeId || undefined,
          page,
          limit: 24,
        });
        if (!response.success) {
          setError('Unable to load fabrics right now.');
          setFabrics([]);
          return;
        }
        const rows = (response.data?.fabrics || []).map((fabric: any) => ({
          id: fabric.id,
          name: fabric.name,
          description: fabric.description,
          pricePerMeter: Number(fabric.finalPrice || 0),
          images: fabric.images || [],
          seller: {
            businessName: fabric.seller?.businessName || 'Unknown Seller',
            country: fabric.seller?.country || '',
          },
          materialType: {
            id: fabric.materialType?.id,
            name: fabric.materialType?.name || 'Material',
          },
          isFeatured: Boolean(fabric.isFeatured),
        }));
        setFabrics(rows);
        setPagination({
          page: response.data?.pagination?.page || 1,
          pages: response.data?.pagination?.pages || 1,
          total: response.data?.pagination?.total || 0,
        });
      } catch (loadError) {
        console.error('Failed to load fabrics:', loadError);
        setError('Unable to load fabrics right now.');
        setFabrics([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [filters, page, reloadToken]);

  const sortedFabrics = useMemo(() => {
    const rows = [...fabrics];
    if (filters.sortBy === 'price-low') {
      rows.sort((a, b) => a.pricePerMeter - b.pricePerMeter);
    } else if (filters.sortBy === 'price-high') {
      rows.sort((a, b) => b.pricePerMeter - a.pricePerMeter);
    }
    return rows;
  }, [fabrics, filters.sortBy]);

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

  const activeFiltersCount = [draftFilters.search, draftFilters.country, draftFilters.materialTypeId].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img src="/images/hero-fabrics.jpg" alt="African Fabrics" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.5), transparent)' }} />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">African Fabrics</h1>
              <p className="text-lg text-white text-opacity-80">Premium textiles from across the continent.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((previous) => ({ ...previous, search: e.target.value }))}
                placeholder="Search fabrics..."
                className="w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <select
              value={draftFilters.country}
              onChange={(e) => setDraftFilters((previous) => ({ ...previous, country: e.target.value }))}
              className="px-3 py-3 border rounded-lg bg-white"
            >
              <option value="">All Countries</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={draftFilters.materialTypeId}
              onChange={(e) => setDraftFilters((previous) => ({ ...previous, materialTypeId: e.target.value }))}
              className="px-3 py-3 border rounded-lg bg-white"
            >
              <option value="">All Materials</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={draftFilters.sortBy}
              onChange={(e) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  sortBy: e.target.value as 'newest' | 'price-low' | 'price-high',
                }))
              }
              className="px-3 py-3 border rounded-lg bg-white"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low-High</option>
              <option value="price-high">Price: High-Low</option>
            </select>

            <Button type="submit" size="sm" className="h-[46px]">
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

            <div className="ml-auto text-xs text-gray-500">Showing {sortedFabrics.length} of {pagination.total} fabrics</div>
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
        ) : sortedFabrics.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No fabrics found for your current filters.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sortedFabrics.map((fabric) => (
                <Link key={fabric.id} to={`/fabrics/${fabric.id}`} className="group">
                  <div className="bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                    <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                      <img
                        src={fabric.images?.[0]?.url || '/placeholder.jpg'}
                        alt={fabric.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {fabric.isFeatured && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="purple">Featured</Badge>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center z-10">
                        <span className="text-2xl shadow-lg">{countryFlags[fabric.seller?.country] || '🌍'}</span>
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
                        {fabric.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{fabric.seller?.businessName}</p>
                      <p className="text-coral-500 font-semibold mt-2">
                        {formatFromUsd(fabric.pricePerMeter)}/yard
                      </p>
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
