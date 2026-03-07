import { useState, useEffect, type SyntheticEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Star, 
  Ruler, 
  Shirt,
  ShoppingBag,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api, resolveAssetUrl } from '../services/api';
import { fashionFallbackImage } from '../utils/fashionPlaceholder';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/ToastProvider';
import { getHomeRouteForRole, isCustomerRole } from '../auth/rbac';
import { useCurrency } from '../components/ui/CurrencyProvider';

interface Design {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  category: { id: string; name: string };
  designer: {
    id: string;
    businessName: string;
    country: string;
    city: string;
    profileImage?: string;
  };
  suitableFabrics: Array<{
    fabric: {
      id: string;
      name: string;
      images: string[];
      pricePerMeter: number;
      seller: {
        businessName: string;
        country: string;
      };
    };
    minMeters: number;
    maxMeters: number;
  }>;
  measurements: Array<{
    name: string;
    description: string;
    unit: string;
    isRequired: boolean;
  }>;
  rating: number;
  reviewCount: number;
  orderCount: number;
  isFeatured?: boolean;
  featuredSections?: string[];
}

interface RelatedDesignCard {
  id: string;
  name: string;
  image: string;
  designerName: string;
  price: number;
}

const fallbackImage = (seed: string, width = 1200, height = 1600) =>
  fashionFallbackImage(seed, { width, height });

const handleImageFallback =
  (seed: string, width = 1200, height = 1600) =>
  (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    const fallback = fallbackImage(seed, width, height);
    if (target.src === fallback) return;
    target.src = fallback;
  };

export default function DesignDetail() {
  const { formatFromUsd } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const toast = useToast();
  
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);
  const [fabricMeters, setFabricMeters] = useState<Record<string, number>>({});
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'fabrics' | 'measurements'>('details');
  const [relatedDesigns, setRelatedDesigns] = useState<RelatedDesignCard[]>([]);
  const shoppingBlockedForRole = Boolean(user && !isCustomerRole(user.role));

  useEffect(() => {
    fetchDesign();
  }, [id]);

  const fetchDesign = async () => {
    try {
      setLoading(true);
      const response = await api.products.getDesign(id!);
      if (response.success) {
        const mappedDesign: Design = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          basePrice: Number(response.data.finalPrice || response.data.basePrice || 0),
          images: (response.data.images || []).map((img: any) => resolveAssetUrl(img.url)).filter(Boolean),
          category: {
            id: response.data.category?.id,
            name: response.data.category?.name || 'Design',
          },
          designer: {
            id: response.data.designerId,
            businessName: response.data.designer?.businessName || 'Designer',
            country: response.data.designer?.country || '',
            city: response.data.designer?.city || '',
            profileImage: undefined,
          },
          suitableFabrics: (response.data.suitableFabrics || []).map((sf: any) => ({
            fabric: {
              id: sf.fabric?.id,
              name: sf.fabric?.name || 'Fabric',
              images: (sf.fabric?.images || []).map((img: any) => resolveAssetUrl(img.url)).filter(Boolean),
              pricePerMeter: Number(sf.fabric?.finalPrice || sf.fabric?.sellerPrice || 0),
              seller: {
                businessName: sf.fabric?.seller?.businessName || 'Seller',
                country: sf.fabric?.seller?.country || '',
              },
            },
            minMeters: Number(sf.yardsNeeded || 1),
            maxMeters: Number(sf.yardsNeeded || 1) + 5,
          })),
          measurements: (response.data.measurementVariables || []).map((m: any) => ({
            name: m.name,
            description: m.instructions || m.name,
            unit: m.unit || 'cm',
            isRequired: Boolean(m.isRequired),
          })),
          rating: Number(response.data.designer?.rating || 0),
          reviewCount: 0,
          orderCount: Number(response.data.totalOrders || 0),
          isFeatured: Boolean(response.data.isFeatured),
          featuredSections: response.data.featuredSections || [],
        };
        setDesign(mappedDesign);
        void fetchRelatedDesigns(mappedDesign);
        // Initialize fabric meters
        const initialMeters: Record<string, number> = {};
        mappedDesign.suitableFabrics.forEach((sf: any) => {
          initialMeters[sf.fabric.id] = sf.minMeters;
        });
        setFabricMeters(initialMeters);
      }
    } catch (error) {
      console.error('Failed to fetch design:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapRelatedDesign = (row: any): RelatedDesignCard => ({
    id: row.id,
    name: row.name,
    image: resolveAssetUrl(row.images?.[0]?.url),
    designerName: row.designer?.businessName || 'Designer',
    price: Number(row.finalPrice || row.basePrice || 0),
  });

  const fetchRelatedDesigns = async (currentDesign: Design) => {
    try {
      const primary = await api.products.getDesigns({
        categoryId: currentDesign.category?.id || undefined,
        country: currentDesign.designer?.country || undefined,
        page: 1,
        limit: 12,
      });
      const fallback = await api.products.getDesigns({
        categoryId: currentDesign.category?.id || undefined,
        page: 1,
        limit: 12,
      });
      const merged = [
        ...(primary.success ? primary.data?.designs || [] : []),
        ...(fallback.success ? fallback.data?.designs || [] : []),
      ];
      const unique = new Map<string, RelatedDesignCard>();
      for (const row of merged) {
        const mapped = mapRelatedDesign(row);
        if (!mapped.id || mapped.id === currentDesign.id) continue;
        if (!unique.has(mapped.id)) unique.set(mapped.id, mapped);
      }
      setRelatedDesigns(Array.from(unique.values()).slice(0, 4));
    } catch (relatedError) {
      console.error('Failed to load related designs:', relatedError);
      setRelatedDesigns([]);
    }
  };

  const handleAddToCart = () => {
    if (!selectedFabric) {
      setActiveTab('fabrics');
      return;
    }
    
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isCustomerRole(user.role)) {
      toast.error('Only customer accounts can shop. Please use a customer account.');
      navigate(getHomeRouteForRole(user.role), { replace: true });
      return;
    }

    const fabric = design?.suitableFabrics.find(sf => sf.fabric.id === selectedFabric);
    if (!fabric || !design) return;

    const cartItem = {
      designId: design.id,
      designName: design.name,
      designImage: design.images[0],
      fabricId: fabric.fabric.id,
      fabricName: fabric.fabric.name,
      fabricImage: fabric.fabric.images[0],
      fabricMeters: fabricMeters[selectedFabric],
      fabricPrice: fabric.fabric.pricePerMeter,
      designerId: design.designer.id,
      designerName: design.designer.businessName,
      measurements,
      basePrice: design.basePrice,
      totalPrice: calculateTotal(),
    };

    addItem(cartItem);
    navigate('/cart');
  };

  const handleTryOn = () => {
    if (!selectedFabric) {
      setActiveTab('fabrics');
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isCustomerRole(user.role)) {
      toast.error('Only customer accounts can shop. Please use a customer account.');
      navigate(getHomeRouteForRole(user.role), { replace: true });
      return;
    }
    navigate(`/try-on/${id}?fabric=${selectedFabric}`);
  };

  const calculateTotal = () => {
    if (!design || !selectedFabric) return 0;
    const fabric = design.suitableFabrics.find(sf => sf.fabric.id === selectedFabric);
    if (!fabric) return design.basePrice;
    const meters = fabricMeters[selectedFabric] || fabric.minMeters;
    return design.basePrice + (fabric.fabric.pricePerMeter * meters);
  };

  const handleMeasurementChange = (name: string, value: number) => {
    setMeasurements(prev => ({ ...prev, [name]: value }));
  };

  const areAllRequiredMeasurementsFilled = () => {
    if (!design) return false;
    return design.measurements
      .filter(m => m.isRequired)
      .every(m => measurements[m.name] && measurements[m.name] > 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500"></div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Design Not Found</h2>
          <p className="text-gray-600 mb-4">The design you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/custom-to-wear')}>Browse Designs</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={design.images?.[0] || '/images/placeholder.jpg'}
          alt={design.name}
          onError={handleImageFallback(`design-hero-${design.id}`, 1920, 1080)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/25" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 md:pb-8">
            <Link to="/custom-to-wear" className="inline-flex items-center text-white/90 hover:text-white transition-colors mb-3">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Designs
            </Link>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-coral-300 uppercase">Custom To Wear</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white line-clamp-2">{design.name}</h1>
            <p className="text-sm md:text-base text-white/80 mt-1">{design.category?.name || 'Design'}</p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '4/5' }}>
              <img
                src={design.images[selectedImage] || '/images/placeholder.jpg'}
                alt={design.name}
                onError={handleImageFallback(`design-detail-${design.id}`)}
                className="w-full h-full object-cover"
              />
              {design.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(prev => prev === 0 ? design.images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(prev => prev === design.images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </button>
            </div>
            
            {/* Thumbnails */}
            {design.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {design.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-coral-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" onError={handleImageFallback(`design-thumb-${design.id}-${idx}`, 300, 300)} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">{design.category.name}</Badge>
                  {design.isFeatured && (
                    <Badge variant="purple">Featured</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{design.name}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-coral-500 text-coral-500" />
                  <span className="font-medium">{design.rating.toFixed(1)}</span>
                  <span className="text-gray-500">({design.reviewCount} reviews)</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">{design.orderCount} orders</span>
              </div>
            </div>

            {/* Designer Info */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <div className="w-14 h-14 bg-coral-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-coral-600">
                  {design.designer.businessName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{design.designer.businessName}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  {design.designer.city}, {design.designer.country}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!design.designer?.id}
                onClick={() => {
                  if (!design.designer?.id) return;
                  navigate(`/store/designer/${design.designer.id}`);
                }}
              >
                View Profile
              </Button>
            </div>

            {/* Price */}
            <div className="p-4 bg-coral-50 rounded-xl border border-coral-100">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-coral-600">
                  {formatFromUsd(calculateTotal())}
                </span>
                <span className="text-gray-500">total price</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Base: {formatFromUsd(design.basePrice)} + Fabric (varies by selection)
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex gap-6">
                {(['details', 'fabrics', 'measurements'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                      activeTab === tab ? 'text-coral-500' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <p className="text-gray-600 leading-relaxed">{design.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <Shirt className="w-5 h-5 text-coral-500" />
                      <div>
                        <p className="text-sm font-medium">Custom Made</p>
                        <p className="text-xs text-gray-500">To your measurements</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <Ruler className="w-5 h-5 text-coral-500" />
                      <div>
                        <p className="text-sm font-medium">Perfect Fit</p>
                        <p className="text-xs text-gray-500">Guaranteed fit policy</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fabrics' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select a fabric for your design. All fabrics are from sellers in the same country as your designer.
                  </p>
                  <div className="space-y-3">
                    {design.suitableFabrics.map(({ fabric, minMeters, maxMeters }) => (
                      <div
                        key={fabric.id}
                        onClick={() => setSelectedFabric(fabric.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedFabric === fabric.id 
                            ? 'border-coral-500 bg-coral-50' 
                            : 'border-gray-200 hover:border-coral-300'
                        }`}
                      >
                        <div className="flex gap-4">
                          <img
                            src={fabric.images[0]}
                            alt={fabric.name}
                            onError={handleImageFallback(`design-fabric-${fabric.id}`)}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{fabric.name}</h4>
                                <p className="text-sm text-gray-500">{fabric.seller.businessName}</p>
                                <p className="text-sm text-gray-500">{fabric.seller.country}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-coral-600">
                                  {formatFromUsd(fabric.pricePerMeter)}/meter
                                </p>
                                <p className="text-xs text-gray-500">
                                  {minMeters}-{maxMeters} meters needed
                                </p>
                              </div>
                            </div>
                            {selectedFabric === fabric.id && (
                              <div className="mt-3 pt-3 border-t border-coral-200">
                                <label className="text-sm font-medium text-gray-700">
                                  Meters: {fabricMeters[fabric.id]}
                                </label>
                                <input
                                  type="range"
                                  min={minMeters}
                                  max={maxMeters}
                                  step={0.5}
                                  value={fabricMeters[fabric.id] || minMeters}
                                  onChange={(e) => setFabricMeters(prev => ({
                                    ...prev,
                                    [fabric.id]: parseFloat(e.target.value)
                                  }))}
                                  className="w-full mt-1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'measurements' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Enter your measurements for a perfect fit.
                    </p>
                    <button
                      onClick={() => setShowMeasurementModal(true)}
                      className="text-sm text-coral-500 hover:text-coral-600 font-medium"
                    >
                      How to measure?
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {design.measurements.map((measurement) => (
                      <div key={measurement.name} className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          {measurement.name}
                          {measurement.isRequired && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={measurements[measurement.name] || ''}
                            onChange={(e) => handleMeasurementChange(measurement.name, parseFloat(e.target.value))}
                            placeholder={measurement.description}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {measurement.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleTryOn}
                disabled={!selectedFabric || shoppingBlockedForRole}
              >
                <Eye className="w-4 h-4 mr-2" />
                Virtual Try-On
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!selectedFabric || shoppingBlockedForRole}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>

            {!selectedFabric && (
              <p className="text-sm text-coral-500 text-center">
                Please select a fabric to continue
              </p>
            )}
            {shoppingBlockedForRole && (
              <p className="text-sm text-red-600 text-center">
                Shopping is only available for customer accounts.
              </p>
            )}
          </div>
        </div>
      </div>

      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Related Designs</h2>
              <p className="text-sm text-gray-500">Suggested from the same category and market.</p>
            </div>
            <Link
              to={`/custom-to-wear${design.category?.id ? `?category=${encodeURIComponent(design.category.id)}` : ''}`}
              className="text-sm font-medium text-coral-600 hover:text-coral-700"
            >
              View all
            </Link>
          </div>
          {relatedDesigns.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedDesigns.map((item) => (
                <Link key={item.id} to={`/custom-to-wear/${item.id}`} className="group bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-100 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                    <img
                      src={item.image || '/images/placeholder.jpg'}
                      alt={item.name}
                      onError={handleImageFallback(`related-design-${item.id}`)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.designerName}</p>
                    <p className="text-sm font-semibold text-coral-600 mt-1">{formatFromUsd(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-4 text-sm text-gray-600">
              Related products will appear as matching designs are added.
            </div>
          )}
        </div>
      </section>

      {/* Measurement Guide Modal */}
      {showMeasurementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">How to Measure</h3>
                <button 
                  onClick={() => setShowMeasurementModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                {design.measurements.map((m) => (
                  <div key={m.name} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-1">{m.name}</h4>
                    <p className="text-sm text-gray-600">{m.description}</p>
                    <p className="text-sm text-coral-500 mt-1">Unit: {m.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
