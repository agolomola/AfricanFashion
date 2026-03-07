import { useState, useEffect, type SyntheticEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart, Star, MapPin, Ruler, Loader2, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { api, resolveAssetUrl } from '../services/api';
import { fashionFallbackImage } from '../utils/fashionPlaceholder';
import Badge from '../components/ui/Badge';
import { useCurrency } from '../components/ui/CurrencyProvider';

interface Fabric {
  id: string;
  name: string;
  description: string;
  pricePerMeter: number;
  minOrderMeters: number;
  stockMeters: number;
  images: { url: string }[];
  seller: {
    id: string;
    businessName: string;
    country: string;
    rating: number;
    reviewCount: number;
  };
  materialType: { id: string; name: string };
  flag?: string;
  careInstructions?: string;
  shippingInfo?: string;
  isFeatured?: boolean;
  featuredSections?: string[];
}

const countryFlags: Record<string, string> = {
  'Ghana': '🇬🇭',
  'Nigeria': '🇳🇬',
  'Kenya': '🇰🇪',
  'Senegal': '🇸🇳',
  'Ethiopia': '🇪🇹',
  'Morocco': '🇲🇦',
  'Mali': '🇲🇱',
  'South Africa': '🇿🇦',
  'Tanzania': '🇹🇿',
};

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

export default function FabricDetail() {
  const { formatFromUsd } = useCurrency();
  const { id } = useParams();
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [relatedFabrics, setRelatedFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(2);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchFabric = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await api.products.getFabric(id);
        if (response.success) {
          const mappedFabric: Fabric = {
            id: response.data.id,
            name: response.data.name,
            description: response.data.description,
            pricePerMeter: Number(response.data.finalPrice || response.data.sellerPrice || 0),
            minOrderMeters: Number(response.data.minYards || 1),
            stockMeters: Number(response.data.stockYards || 0),
            images: (response.data.images || []).map((img: any) => ({ url: resolveAssetUrl(img.url) })),
            seller: {
              id: response.data.sellerId,
              businessName: response.data.seller?.businessName || 'Unknown Seller',
              country: response.data.seller?.country || '',
              rating: Number(response.data.seller?.rating || 0),
              reviewCount: 0,
            },
            materialType: {
              id: response.data.materialType?.id,
              name: response.data.materialType?.name || 'Material',
            },
            isFeatured: Boolean(response.data.isFeatured),
            featuredSections: response.data.featuredSections || [],
          };
          setFabric(mappedFabric);
          setQuantity(mappedFabric.minOrderMeters || 1);
          void fetchRelatedFabrics(mappedFabric);
        } else {
          setError('Failed to load fabric details');
        }
      } catch (err) {
        console.error('Error fetching fabric:', err);
        setError('Failed to load fabric details');
      } finally {
        setLoading(false);
      }
    };

    fetchFabric();
  }, [id]);

  const mapFabricRow = (row: any): Fabric => ({
    id: row.id,
    name: row.name,
    description: row.description,
    pricePerMeter: Number(row.finalPrice || row.sellerPrice || 0),
    minOrderMeters: Number(row.minYards || 1),
    stockMeters: Number(row.stockYards || 0),
    images: (row.images || []).map((img: any) => ({ url: resolveAssetUrl(img.url) })),
    seller: {
      id: row.seller?.userId || row.sellerId,
      businessName: row.seller?.businessName || 'Unknown Seller',
      country: row.seller?.country || '',
      rating: Number(row.seller?.rating || 0),
      reviewCount: 0,
    },
    materialType: {
      id: row.materialType?.id,
      name: row.materialType?.name || 'Material',
    },
    isFeatured: Boolean(row.isFeatured),
    featuredSections: row.featuredSections || [],
  });

  const fetchRelatedFabrics = async (currentFabric: Fabric) => {
    try {
      const primary = await api.products.getFabrics({
        materialTypeId: currentFabric.materialType?.id || undefined,
        country: currentFabric.seller?.country || undefined,
        page: 1,
        limit: 12,
      });

      const fallback = await api.products.getFabrics({
        materialTypeId: currentFabric.materialType?.id || undefined,
        page: 1,
        limit: 12,
      });

      const merged = [
        ...(primary.success ? primary.data?.fabrics || [] : []),
        ...(fallback.success ? fallback.data?.fabrics || [] : []),
      ];
      const unique = new Map<string, Fabric>();
      for (const row of merged) {
        const mapped = mapFabricRow(row);
        if (mapped.id === currentFabric.id) continue;
        if (!unique.has(mapped.id)) unique.set(mapped.id, mapped);
      }
      setRelatedFabrics(Array.from(unique.values()).slice(0, 4));
    } catch (relatedError) {
      console.error('Failed to load related fabrics:', relatedError);
      setRelatedFabrics([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (error || !fabric) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Fabric not found'}</p>
          <Link to="/fabrics-to-sell" className="text-coral-500 hover:underline">
            Back to Fabrics
          </Link>
        </div>
      </div>
    );
  }

  const flag = countryFlags[fabric.seller?.country] || '🌍';

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={fabric.images?.[0]?.url || '/images/placeholder.jpg'}
          alt={fabric.name}
          onError={handleImageFallback(`fabric-hero-${fabric.id}`, 1920, 1080)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/25" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-6 md:pb-8">
            <Link to="/fabrics-to-sell" className="inline-flex items-center text-white/90 hover:text-white transition-colors mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Fabrics
            </Link>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-coral-300 uppercase">Fabrics To Buy</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white line-clamp-2">{fabric.name}</h1>
            <p className="text-sm md:text-base text-white/80 mt-1">{fabric.materialType?.name || 'Fabric'}</p>
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
          <div className="space-y-4">
            <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '4/5' }}>
              <img
                src={fabric.images?.[selectedImage]?.url || '/images/placeholder.jpg'}
                alt={fabric.name}
                onError={handleImageFallback(`fabric-detail-${fabric.id}`)}
                className="w-full h-full object-cover"
              />

              {fabric.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((previous) => (previous === 0 ? fabric.images.length - 1 : previous - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((previous) => (previous === fabric.images.length - 1 ? 0 : previous + 1))}
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
              <div className="absolute bottom-4 right-4 w-12 h-12 flex items-center justify-center bg-white bg-opacity-90 rounded-full">
                <span className="text-3xl">{flag}</span>
              </div>
            </div>

            {fabric.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {fabric.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-coral-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" onError={handleImageFallback(`fabric-thumb-${fabric.id}-${idx}`, 300, 300)} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">{fabric.materialType?.name || 'Material'}</Badge>
                  {fabric.isFeatured && <Badge variant="purple">Featured</Badge>}
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{fabric.name}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-coral-500 text-coral-500" />
                  <span className="font-medium">{fabric.seller?.rating || 0}</span>
                  <span className="text-gray-500">({fabric.seller?.reviewCount || 0} reviews)</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {fabric.seller?.country || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <div className="w-14 h-14 bg-coral-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">{flag}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{fabric.seller?.businessName || 'Unknown Seller'}</h3>
                <p className="text-sm text-gray-500">Fabric seller</p>
              </div>
              {fabric.seller?.id ? (
                <Link to={`/store/seller/${fabric.seller.id}`}>
                  <Button variant="outline" size="sm">View Store</Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>View Store</Button>
              )}
            </div>

            <div className="p-4 bg-coral-50 rounded-xl border border-coral-100">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-coral-600">{formatFromUsd(fabric.pricePerMeter)}</span>
                <span className="text-gray-500">per meter</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Min order: {fabric.minOrderMeters || 1} meters</p>
            </div>

            <p className="text-gray-600 leading-relaxed">{fabric.description}</p>

            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity (meters):</span>
              <div className="flex items-center border rounded-lg bg-white">
                <button
                  onClick={() => setQuantity(Math.max(fabric.minOrderMeters || 1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="px-4 py-2 font-medium w-16 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(Math.max(fabric.stockMeters || 1, 1), quantity + 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-coral-500">{formatFromUsd(fabric.pricePerMeter * quantity)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button className="flex-1 py-4">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`px-6 ${isWishlisted ? 'text-red-500 border-red-500' : ''}`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
            </div>

            <div className="border-t pt-6 space-y-3">
              <div className="flex items-start gap-3">
                <Ruler className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Fabric Width</p>
                  <p className="text-sm text-gray-500">120cm (47 inches)</p>
                </div>
              </div>
              {fabric.careInstructions && (
                <div>
                  <p className="font-medium">Care Instructions</p>
                  <p className="text-sm text-gray-500">{fabric.careInstructions}</p>
                </div>
              )}
              {fabric.shippingInfo && (
                <div>
                  <p className="font-medium">Shipping</p>
                  <p className="text-sm text-gray-500">{fabric.shippingInfo}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Related Fabrics</h2>
              <p className="text-sm text-gray-500">Suggested by material type and country.</p>
            </div>
            <Link to={`/fabrics-to-sell?materialTypeId=${encodeURIComponent(fabric.materialType?.id || '')}`} className="text-sm font-medium text-coral-600 hover:text-coral-700">
              View all
            </Link>
          </div>
          {relatedFabrics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedFabrics.map((item) => (
                <Link key={item.id} to={`/fabrics-to-sell/${item.id}`} className="group bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-100 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                    <img
                      src={item.images?.[0]?.url || '/images/placeholder.jpg'}
                      alt={item.name}
                      onError={handleImageFallback(`related-fabric-${item.id}`)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.seller?.businessName}</p>
                    <p className="text-sm font-semibold text-coral-600 mt-1">{formatFromUsd(item.pricePerMeter)}/yard</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-4 text-sm text-gray-600">
              Related products will appear as more matching fabrics are added.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
