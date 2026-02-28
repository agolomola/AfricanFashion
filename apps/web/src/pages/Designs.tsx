import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { productsApi } from '../services/api';
import type { Design, ProductCategory } from '../types';

export default function Designs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('category') || '',
    country: searchParams.get('country') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  useEffect(() => {
    loadFilters();
    loadDesigns();
  }, [filters]);

  const loadFilters = async () => {
    try {
      const [categoriesRes, countriesRes] = await Promise.all([
        productsApi.getCategories(),
        productsApi.getCountries(),
      ]);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (countriesRes.success) setCountries(countriesRes.data);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const loadDesigns = async () => {
    setIsLoading(true);
    try {
      const response = await productsApi.getDesigns({
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        country: filters.country || undefined,
        page: filters.page,
        limit: 12,
      });
      if (response.success) {
        setDesigns(response.data.designs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load designs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.categoryId) params.set('category', newFilters.categoryId);
    if (newFilters.country) params.set('country', newFilters.country);
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-4xl text-navy-600 font-bold mb-4">Designs</h1>
          <p className="text-gray-600 max-w-2xl">
            Discover unique African fashion designs from talented designers across the continent.
            Each piece is custom-made to your measurements.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search designs..."
                className="input pl-12 w-full"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={filters.categoryId}
                onChange={(e) => updateFilter('categoryId', e.target.value)}
                className="input pr-10 appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Country Filter */}
            <div className="relative">
              <select
                value={filters.country}
                onChange={(e) => updateFilter('country', e.target.value)}
                className="input pr-10 appearance-none cursor-pointer"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No designs found matching your criteria.</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">{pagination?.total || designs.length} designs found</p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {designs.map((design) => (
                <Link key={design.id} to={`/designs/${design.id}`} className="group">
                  <div className="card">
                    <div className="aspect-[3/4] overflow-hidden relative">
                      <img
                        src={design.images?.[0]?.url || '/placeholder.jpg'}
                        alt={design.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="badge badge-info">{design.designer?.country}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors line-clamp-1">
                        {design.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{design.designer?.businessName}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-coral-500 font-semibold">${design.finalPrice}</p>
                        <span className="text-xs text-gray-400">{design.category?.name}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center mt-12 gap-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setFilters({ ...filters, page })}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      filters.page === page
                        ? 'bg-coral-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
