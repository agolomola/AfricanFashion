import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, Loader2, SlidersHorizontal, X, ChevronLeft, ChevronRight, Heart, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

interface Fabric {
  id: string;
  name: string;
  description: string;
  pricePerMeter: number;
  images: { url: string }[];
  seller: {
    id: string;
    businessName: string;
    country: string;
  };
  materialType: {
    id: string;
    name: string;
  };
  flag: string;
}

interface MaterialType {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Sample fabrics
const sampleFabrics: Fabric[] = [
  {
    id: '1',
    name: 'Premium Kente Cloth',
    description: 'Authentic Ghanaian Kente fabric',
    pricePerMeter: 45,
    images: [{ url: '/images/fabrics/kente-cloth.jpg' }],
    seller: { id: 's1', businessName: 'Kente Masters', country: 'Ghana' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇬🇭',
  },
  {
    id: '2',
    name: 'Ankara Wax Print',
    description: 'Vibrant African wax print fabric',
    pricePerMeter: 12,
    images: [{ url: '/images/fabrics/ankara-wax.jpg' }],
    seller: { id: 's2', businessName: 'Lagos Fabrics', country: 'Nigeria' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇳🇬',
  },
  {
    id: '3',
    name: 'Aso Oke Fabric',
    description: 'Traditional Yoruba woven fabric',
    pricePerMeter: 85,
    images: [{ url: '/images/fabrics/asooke-fabric.jpg' }],
    seller: { id: 's3', businessName: 'Yoruba Textiles', country: 'Nigeria' },
    materialType: { id: 'm2', name: 'Silk' },
    flag: '🇳🇬',
  },
  {
    id: '4',
    name: 'Shweshwe Print',
    description: 'Traditional South African fabric',
    pricePerMeter: 18,
    images: [{ url: '/images/fabrics/shweshwe.jpg' }],
    seller: { id: 's4', businessName: 'Cape Fabrics', country: 'South Africa' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇿🇦',
  },
  {
    id: '5',
    name: 'Kitenge Fabric',
    description: 'East African print fabric',
    pricePerMeter: 15,
    images: [{ url: '/images/fabrics/kitenge.jpg' }],
    seller: { id: 's5', businessName: 'Dar Fabrics', country: 'Tanzania' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇹🇿',
  },
  {
    id: '6',
    name: 'Bogolanfini Mud Cloth',
    description: 'Handmade Malian mud cloth',
    pricePerMeter: 55,
    images: [{ url: '/images/fabrics/mud-cloth.jpg' }],
    seller: { id: 's6', businessName: 'Mali Artisans', country: 'Mali' },
    materialType: { id: 'm3', name: 'Cotton Mud Cloth' },
    flag: '🇲🇱',
  },
  {
    id: '7',
    name: 'Maasai Shuka',
    description: 'Traditional Maasai checkered fabric',
    pricePerMeter: 22,
    images: [{ url: '/images/fabrics/maasai-shuka.jpg' }],
    seller: { id: 's7', businessName: 'Kenya Textiles', country: 'Kenya' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇰🇪',
  },
  {
    id: '8',
    name: 'Adire Tie-Dye',
    description: 'Nigerian indigo resist-dyed fabric',
    pricePerMeter: 28,
    images: [{ url: '/images/fabrics/adire-tiedye.jpg' }],
    seller: { id: 's8', businessName: 'Abeokuta Fabrics', country: 'Nigeria' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇳🇬',
  },
  {
    id: '9',
    name: 'Bazin Riche',
    description: 'Premium Malian brocade fabric',
    pricePerMeter: 65,
    images: [{ url: '/images/fabrics/bazin-rich.jpg' }],
    seller: { id: 's9', businessName: 'Bamako Textiles', country: 'Mali' },
    materialType: { id: 'm4', name: 'Brocade' },
    flag: '🇲🇱',
  },
  {
    id: '10',
    name: 'Dashiki Print',
    description: 'Vibrant Dashiki pattern fabric',
    pricePerMeter: 14,
    images: [{ url: '/images/fabrics/dashiki-print.jpg' }],
    seller: { id: 's10', businessName: 'West African Fabrics', country: 'Ghana' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇬🇭',
  },
  {
    id: '11',
    name: 'Kente Strip Cloth',
    description: 'Narrow strip Kente weaving',
    pricePerMeter: 75,
    images: [{ url: '/images/fabrics/kente-strip.jpg' }],
    seller: { id: 's11', businessName: 'Ashanti Weavers', country: 'Ghana' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇬🇭',
  },
  {
    id: '12',
    name: 'Tie-Dye Fabric',
    description: 'Hand-dyed African fabric',
    pricePerMeter: 20,
    images: [{ url: '/images/fabrics/tie-dye.jpg' }],
    seller: { id: 's12', businessName: 'Gambia Colors', country: 'Gambia' },
    materialType: { id: 'm1', name: 'Cotton' },
    flag: '🇬🇲',
  },
];

export default function Fabrics() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data states
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    materialTypeId: searchParams.get('material') || '',
    country: searchParams.get('country') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
  });
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Load data on filter change
  useEffect(() => {
    loadFilters();
    loadFabrics();
  }, [filters]);

  // Sample material types and countries
  const sampleMaterialTypes: MaterialType[] = [
    { id: 'm1', name: 'Cotton' },
    { id: 'm2', name: 'Silk' },
    { id: 'm3', name: 'Cotton Mud Cloth' },
    { id: 'm4', name: 'Brocade' },
    { id: 'm5', name: 'Linen' },
    { id: 'm6', name: 'Wool' },
  ];

  const sampleCountries = ['Ghana', 'Nigeria', 'Mali', 'Senegal', 'Tanzania', 'South Africa', 'Kenya', 'Gambia'];

  const loadFilters = async () => {
    try {
      const [materialsRes, countriesRes] = await Promise.all([
        api.products.getMaterialTypes(),
        api.products.getCountries(),
      ]);
      if (materialsRes.success && materialsRes.data.length > 0) {
        setMaterialTypes(materialsRes.data);
      } else {
        setMaterialTypes(sampleMaterialTypes);
      }
      if (countriesRes.success && countriesRes.data.length > 0) {
        setCountries(countriesRes.data);
      } else {
        setCountries(sampleCountries);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
      setMaterialTypes(sampleMaterialTypes);
      setCountries(sampleCountries);
    }
  };

  const loadFabrics = async () => {
    setIsLoading(true);
    try {
      const response = await api.products.getFabrics({
        search: filters.search || undefined,
        materialTypeId: filters.materialTypeId || undefined,
        country: filters.country || undefined,
        page: filters.page,
        limit: 200,
      });
      if (response.success && response.data.fabrics.length > 0) {
        setFabrics(response.data.fabrics);
        setPagination(response.data.pagination);
      } else {
        setFabrics(sampleFabrics);
        setPagination({
          page: 1,
          limit: 12,
          total: sampleFabrics.length,
          pages: 1,
        });
      }
    } catch (error) {
      console.error('Failed to load fabrics:', error);
      setFabrics(sampleFabrics);
      setPagination({
        page: 1,
        limit: 12,
        total: sampleFabrics.length,
        pages: 1,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    updateURLParams(newFilters);
  };

  const updateURLParams = (newFilters: typeof filters) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.materialTypeId) params.set('material', newFilters.materialTypeId);
    if (newFilters.country) params.set('country', newFilters.country);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    if (newFilters.sortBy !== 'newest') params.set('sortBy', newFilters.sortBy);
    if (newFilters.page > 1) params.set('page', newFilters.page.toString());
    setSearchParams(params);
  };

  const clearFilters = () => {
    const cleared = {
      search: '',
      materialTypeId: '',
      country: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest',
      page: 1,
    };
    setFilters(cleared);
    updateURLParams(cleared);
  };

  const goToPage = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateURLParams(newFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFiltersCount = [
    filters.materialTypeId,
    filters.country,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length;

  // Filter Bar Component - Single row with search
  const FilterBar = () => (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {/* Search Bar */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search fabrics..."
          className="w-40 md:w-48 pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-coral-500 focus:outline-none"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Material Types Dropdown */}
      <div className="relative">
        <select
          value={filters.materialTypeId}
          onChange={(e) => updateFilter('materialTypeId', e.target.value)}
          className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 focus:border-transparent bg-white"
        >
          <option value="">All Materials</option>
          {materialTypes.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Countries Dropdown */}
      <div className="relative">
        <select
          value={filters.country}
          onChange={(e) => updateFilter('country', e.target.value)}
          className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 focus:border-transparent bg-white"
        >
          <option value="">All Countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Price Range */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            className="w-20 pl-5 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-coral-500"
          />
        </div>
        <span className="text-gray-400 text-sm">-</span>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            className="w-20 pl-5 pr-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-coral-500"
          />
        </div>
      </div>

      {/* Sort */}
      <div className="relative">
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 bg-white"
        >
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low-High</option>
          <option value="price-high">Price: High-Low</option>
          <option value="rating">Rated</option>
          <option value="popular">Popular</option>
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <button
          onClick={clearFilters}
          className="px-3 py-2 text-xs text-coral-500 font-medium hover:bg-coral-50 rounded-lg transition-colors border border-coral-200"
        >
          Clear ({activeFiltersCount})
        </button>
      )}

      {/* Results Count */}
      <div className="ml-auto text-xs text-gray-500">
        {pagination?.total || 0} fabrics
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="relative h-96 md:h-[28rem] lg:h-[32rem] overflow-hidden">
        <img
          src="/images/hero-fabrics.jpg"
          alt="African Fabrics"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/80 via-navy-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                Fabrics To Buy
              </h1>
              <p className="text-base md:text-lg text-white/80 mb-6">
                Premium African textiles by the yard. Kente, Ankara, Kitenge and more direct from artisans across the continent.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="info" className="bg-white/20 text-white border-0 text-xs">
                  {pagination?.total || 0}+ Fabrics
                </Badge>
                <Badge variant="info" className="bg-white/20 text-white border-0 text-xs">
                  {countries.length}+ Countries
                </Badge>
                <Badge variant="info" className="bg-white/20 text-white border-0 text-xs">
                  By The Yard
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Section - 2 Columns */}
      <section className="bg-gray-50 py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Banner 1 */}
            <Link to="/designs" className="group relative h-48 md:h-56 rounded-lg overflow-hidden">
              <img
                src="/images/banner-custom-designs.jpg"
                alt="Custom Designs"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-900/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-6">
                <span className="text-coral-400 text-sm font-semibold mb-1">CUSTOM DESIGNS</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Made For You</h3>
                <p className="text-white/80 text-sm mb-3">Get any design tailored to your measurements</p>
                <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                  Explore <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            {/* Banner 2 */}
            <Link to="/ready-to-wear" className="group relative h-48 md:h-56 rounded-lg overflow-hidden">
              <img
                src="/images/banner-ready-to-wear.jpg"
                alt="Ready To Wear"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-coral-600/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-6">
                <span className="text-white text-sm font-semibold mb-1">READY TO WEAR</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Shop Now</h3>
                <p className="text-white/80 text-sm mb-3">Finished pieces ready to ship</p>
                <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                  Shop <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Bar - Single Row Below Banner */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-coral-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Desktop Filter Bar */}
            <div className="hidden lg:block flex-1">
              <FilterBar />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        {/* Mobile Filter Bar */}
        <div className="lg:hidden mb-4">
          <FilterBar />
        </div>

        {/* Products Grid */}
        <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-coral-500" />
              </div>
            ) : fabrics.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No fabrics found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                <Button onClick={clearFilters} variant="outline">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <>
                {/* 4 Column Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {fabrics.map((fabric) => (
                    <Link 
                      key={fabric.id} 
                      to={`/fabrics/${fabric.id}`} 
                      className="group"
                    >
                      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                        {/* Image */}
                        <div className="aspect-[3/4] overflow-hidden relative bg-gray-100">
                          <img
                            src={fabric.images?.[0]?.url || '/placeholder.jpg'}
                            alt={fabric.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          {/* Country flag - bottom right */}
                          <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center z-10">
                            <span className="text-2xl drop-shadow-lg">{fabric.flag}</span>
                          </div>
                          {/* Heart button - top right */}
                          <button 
                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-500 hover:text-white"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                            {fabric.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {fabric.seller?.businessName}
                          </p>
                          <p className="text-coral-500 font-semibold mt-2">${fabric.pricePerMeter}<span className="text-sm font-normal text-gray-500">/yard</span></p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center items-center mt-12 gap-2">
                    <button
                      onClick={() => goToPage(filters.page - 1)}
                      disabled={filters.page === 1}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(10, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 10) {
                        pageNum = i + 1;
                      } else if (filters.page <= 5) {
                        pageNum = i + 1;
                      } else if (filters.page >= pagination.pages - 4) {
                        pageNum = pagination.pages - 9 + i;
                      } else {
                        pageNum = filters.page - 4 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${filters.page === pageNum ? 'bg-coral-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => goToPage(filters.page + 1)}
                      disabled={filters.page === pagination.pages}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Page Info */}
                {pagination && (
                  <p className="text-center text-gray-500 mt-4">
                    Page {pagination.page} of {pagination.pages} • Showing {fabrics.length} of {pagination.total} fabrics
                  </p>
                )}
              </>
            )}
          </div>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white overflow-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button onClick={() => setShowMobileFilters(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <FilterBar />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
