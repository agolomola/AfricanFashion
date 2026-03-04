import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, Loader2, SlidersHorizontal, X, ChevronLeft, ChevronRight, Heart, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: { url: string }[];
  designer: {
    id: string;
    businessName: string;
    country: string;
  };
  category: {
    id: string;
    name: string;
  };
  sizes: string[];
  flag: string;
}

interface Category {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Sample ready to wear products
const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Kente Shift Dress',
    description: 'Modern shift dress in Kente print',
    price: 185,
    images: [{ url: '/images/readytowear/kente-shift.jpg' }],
    designer: { id: 'd1', businessName: 'Amma Designs', country: 'Ghana' },
    category: { id: 'c1', name: 'Dresses' },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    flag: '🇬🇭',
  },
  {
    id: '2',
    name: 'Ankara Wrap Top',
    description: 'Versatile wrap top in vibrant Ankara',
    price: 75,
    images: [{ url: '/images/readytowear/ankara-wrap.jpg' }],
    designer: { id: 'd2', businessName: 'Lagos Fashion', country: 'Nigeria' },
    category: { id: 'c2', name: 'Tops' },
    sizes: ['S', 'M', 'L', 'XL'],
    flag: '🇳🇬',
  },
  {
    id: '3',
    name: 'Dashiki Bomber Jacket',
    description: 'Contemporary bomber with Dashiki print',
    price: 145,
    images: [{ url: '/images/readytowear/dashiki-bomber.jpg' }],
    designer: { id: 'd3', businessName: 'Mali Heritage', country: 'Mali' },
    category: { id: 'c3', name: 'Jackets' },
    sizes: ['M', 'L', 'XL', 'XXL'],
    flag: '🇲🇱',
  },
  {
    id: '4',
    name: 'Kitenge Palazzo Pants',
    description: 'Wide-leg pants in colorful Kitenge',
    price: 95,
    images: [{ url: '/images/readytowear/kitenge-pants.jpg' }],
    designer: { id: 'd4', businessName: 'Tanzania Threads', country: 'Tanzania' },
    category: { id: 'c4', name: 'Pants' },
    sizes: ['S', 'M', 'L', 'XL'],
    flag: '🇹🇿',
  },
  {
    id: '5',
    name: 'Shweshwe A-Line Skirt',
    description: 'Classic A-line skirt in Shweshwe print',
    price: 85,
    images: [{ url: '/images/readytowear/shweshwe-skirt.jpg' }],
    designer: { id: 'd5', businessName: 'Cape Creations', country: 'South Africa' },
    category: { id: 'c5', name: 'Skirts' },
    sizes: ['XS', 'S', 'M', 'L'],
    flag: '🇿🇦',
  },
  {
    id: '6',
    name: 'Bogolan Kimono',
    description: 'Flowing kimono in authentic mud cloth',
    price: 165,
    images: [{ url: '/images/readytowear/mudcloth-kimono.jpg' }],
    designer: { id: 'd6', businessName: 'Mali Artisans', country: 'Mali' },
    category: { id: 'c6', name: 'Outerwear' },
    sizes: ['One Size'],
    flag: '🇲🇱',
  },
  {
    id: '7',
    name: 'Maasai Beaded Blouse',
    description: 'Blouse with traditional Maasai beadwork',
    price: 195,
    images: [{ url: '/images/readytowear/maasai-blouse.jpg' }],
    designer: { id: 'd7', businessName: 'Kenya Crafts', country: 'Kenya' },
    category: { id: 'c2', name: 'Tops' },
    sizes: ['S', 'M', 'L'],
    flag: '🇰🇪',
  },
  {
    id: '8',
    name: 'Aso Oke Midi Skirt',
    description: 'Elegant midi skirt in Aso Oke fabric',
    price: 220,
    images: [{ url: '/images/readytowear/asooke-skirt.jpg' }],
    designer: { id: 'd8', businessName: 'Yoruba Royalty', country: 'Nigeria' },
    category: { id: 'c5', name: 'Skirts' },
    sizes: ['S', 'M', 'L', 'XL'],
    flag: '🇳🇬',
  },
  {
    id: '9',
    name: 'Kente Blazer',
    description: 'Modern blazer in traditional Kente patterns',
    price: 280,
    images: [{ url: '/images/readytowear/kente-blazer.jpg' }],
    designer: { id: 'd9', businessName: 'Accra Elite', country: 'Ghana' },
    category: { id: 'c7', name: 'Blazers' },
    sizes: ['M', 'L', 'XL', 'XXL'],
    flag: '🇬🇭',
  },
  {
    id: '10',
    name: 'Ankara Maxi Dress',
    description: 'Flowing maxi dress in bold Ankara print',
    price: 165,
    images: [{ url: '/images/readytowear/ankara-maxi.jpg' }],
    designer: { id: 'd10', businessName: 'Lagos Luxe', country: 'Nigeria' },
    category: { id: 'c1', name: 'Dresses' },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    flag: '🇳🇬',
  },
  {
    id: '11',
    name: 'Zulu Print Shirt',
    description: 'Casual shirt in Zulu-inspired print',
    price: 95,
    images: [{ url: '/images/readytowear/zulu-shirt.jpg' }],
    designer: { id: 'd11', businessName: 'Zulu Heritage', country: 'South Africa' },
    category: { id: 'c8', name: 'Shirts' },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    flag: '🇿🇦',
  },
  {
    id: '12',
    name: 'Bogolan Tunic',
    description: 'Traditional tunic in mud cloth print',
    price: 135,
    images: [{ url: '/images/readytowear/bogolan-tunic.jpg' }],
    designer: { id: 'd12', businessName: 'Mali Traditions', country: 'Mali' },
    category: { id: 'c9', name: 'Tunics' },
    sizes: ['S', 'M', 'L', 'XL'],
    flag: '🇲🇱',
  },
];

export default function ReadyToWear() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('category') || '',
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
    loadProducts();
  }, [filters]);

  // Sample categories and countries
  const sampleCategories: Category[] = [
    { id: 'c1', name: 'Dresses' },
    { id: 'c2', name: 'Tops' },
    { id: 'c3', name: 'Jackets' },
    { id: 'c4', name: 'Pants' },
    { id: 'c5', name: 'Skirts' },
    { id: 'c6', name: 'Outerwear' },
    { id: 'c7', name: 'Blazers' },
    { id: 'c8', name: 'Shirts' },
    { id: 'c9', name: 'Tunics' },
  ];

  const sampleCountries = ['Ghana', 'Nigeria', 'Mali', 'Senegal', 'Tanzania', 'South Africa', 'Kenya'];

  const loadFilters = async () => {
    try {
      const [categoriesRes, countriesRes] = await Promise.all([
        api.products.getCategories(),
        api.products.getCountries(),
      ]);
      if (categoriesRes.success && categoriesRes.data.length > 0) {
        setCategories(categoriesRes.data);
      } else {
        setCategories(sampleCategories);
      }
      if (countriesRes.success && countriesRes.data.length > 0) {
        setCountries(countriesRes.data);
      } else {
        setCountries(sampleCountries);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
      setCategories(sampleCategories);
      setCountries(sampleCountries);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.products.getReadyToWear({
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        country: filters.country || undefined,
        page: filters.page,
        limit: 200,
      });
      if (response.success && response.data.products.length > 0) {
        setProducts(response.data.products);
        setPagination(response.data.pagination);
      } else {
        setProducts(sampleProducts);
        setPagination({
          page: 1,
          limit: 12,
          total: sampleProducts.length,
          pages: 1,
        });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts(sampleProducts);
      setPagination({
        page: 1,
        limit: 12,
        total: sampleProducts.length,
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
    if (newFilters.categoryId) params.set('category', newFilters.categoryId);
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
      categoryId: '',
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
    filters.categoryId,
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
          placeholder="Search products..."
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

      {/* Categories Dropdown */}
      <div className="relative">
        <select
          value={filters.categoryId}
          onChange={(e) => updateFilter('categoryId', e.target.value)}
          className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-coral-500 focus:border-transparent bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
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
        {pagination?.total || 0} products
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="relative h-96 md:h-[28rem] lg:h-[32rem] overflow-hidden">
        <img
          src="/images/hero-ready-to-wear.jpg"
          alt="Ready To Wear African Fashion"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/80 via-navy-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                Ready To Wear
              </h1>
              <p className="text-base md:text-lg text-white mb-6">
                Stunning dresses, elegant sets, and chic separates — expertly crafted and ready to ship.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="info" className="bg-white bg-opacity-20 text-white border-0 text-xs">
                  {pagination?.total || 0}+ Products
                </Badge>
                <Badge variant="info" className="bg-white bg-opacity-20 text-white border-0 text-xs">
                  {countries.length}+ Countries
                </Badge>
                <Badge variant="info" className="bg-white bg-opacity-20 text-white border-0 text-xs">
                  Ships in 3-5 Days
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
                <p className="text-white text-sm mb-3">Get any design tailored to your measurements</p>
                <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                  Explore <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            {/* Banner 2 */}
            <Link to="/fabrics" className="group relative h-48 md:h-56 rounded-lg overflow-hidden">
              <img
                src="/images/banner-fabrics.jpg"
                alt="Premium Fabrics"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-coral-600/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-6">
                <span className="text-white text-sm font-semibold mb-1">PREMIUM FABRICS</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">By The Yard</h3>
                <p className="text-white text-sm mb-3">Authentic textiles from across Africa</p>
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
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                <Button onClick={clearFilters} variant="outline">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <>
                {/* 4 Column Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.map((product) => (
                    <Link 
                      key={product.id} 
                      to={`/ready-to-wear/${product.id}`} 
                      className="group"
                    >
                      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                        {/* Image */}
                        <div className="aspect-[3/4] overflow-hidden relative bg-gray-100">
                          <img
                            src={product.images?.[0]?.url || '/placeholder.jpg'}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          {/* Country flag - bottom right */}
                          <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center z-10">
                            <span className="text-2xl drop-shadow-lg">{product.flag}</span>
                          </div>
                          {/* Heart button - top right */}
                          <button 
                            className="absolute top-3 right-3 w-8 h-8 bg-white bg-opacity-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-500 hover:text-white"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {product.designer?.businessName}
                          </p>
                          <p className="text-coral-500 font-semibold mt-2">${product.price}</p>
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
                    Page {pagination.page} of {pagination.pages} • Showing {products.length} of {pagination.total} products
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
