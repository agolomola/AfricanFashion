import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart, Star, MapPin, Truck, Check, Loader2, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { api, resolveAssetUrl } from '../services/api';
import { useCurrency } from '../components/ui/CurrencyProvider';

interface ReadyToWearProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: { url: string }[];
  designer: {
    id: string;
    businessName: string;
    country: string;
    rating: number;
    reviewCount: number;
  };
  category?: { id: string; name: string };
  sizes?: string[];
  colors?: string[];
  material?: string;
  careInstructions?: string;
  shippingInfo?: string;
  inStock?: boolean;
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

export default function ReadyToWearDetail() {
  const { formatFromUsd } = useCurrency();
  const { id } = useParams();
  const [product, setProduct] = useState<ReadyToWearProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ReadyToWearProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await api.products.getReadyToWearProduct(id);
        if (response.success) {
          const sizeVariations = response.data.sizeVariations || [];
          const availableSizes = sizeVariations.filter((s: any) => Number(s.stock || 0) > 0);
          const basePrice = Number(response.data.basePrice || 0);
          const minSizePrice = availableSizes.length > 0
            ? Math.min(...availableSizes.map((s: any) => Number(s.price || basePrice)))
            : basePrice;

          const mappedProduct: ReadyToWearProduct = {
            id: response.data.id,
            name: response.data.name,
            description: response.data.description,
            price: minSizePrice,
            images: (response.data.images || []).map((img: any) => ({ url: resolveAssetUrl(img.url) })),
            designer: {
              id: response.data.designerId,
              businessName: response.data.designer?.businessName || 'Designer',
              country: response.data.designer?.country || '',
              rating: Number(response.data.designer?.rating || 0),
              reviewCount: 0,
            },
            category: response.data.category,
            sizes: (availableSizes.length > 0 ? availableSizes : sizeVariations).map((s: any) => s.size),
            inStock: sizeVariations.some((s: any) => Number(s.stock || 0) > 0),
            isFeatured: Boolean(response.data.isFeatured),
            featuredSections: response.data.featuredSections || [],
          };

          setProduct(mappedProduct);
          void fetchRelatedProducts(mappedProduct);
          if (mappedProduct.sizes && mappedProduct.sizes.length > 0) {
            setSelectedSize(mappedProduct.sizes[0]);
          }
          if (mappedProduct.colors && mappedProduct.colors.length > 0) {
            setSelectedColor(mappedProduct.colors[0]);
          }
        } else {
          setError('Failed to load product details');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const mapReadyToWearRow = (row: any): ReadyToWearProduct => {
    const variations = row.sizeVariations || [];
    const inStockVariations = variations.filter((variation: any) => Number(variation.stock || 0) > 0);
    const basePrice = Number(row.basePrice || 0);
    const minPrice = inStockVariations.length > 0
      ? Math.min(...inStockVariations.map((variation: any) => Number(variation.price || basePrice)))
      : basePrice;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: minPrice,
      images: (row.images || []).map((img: any) => ({ url: resolveAssetUrl(img.url) })),
      designer: {
        id: row.designer?.userId || row.designerId,
        businessName: row.designer?.businessName || 'Designer',
        country: row.designer?.country || '',
        rating: Number(row.designer?.rating || 0),
        reviewCount: 0,
      },
      category: row.category,
      sizes: (inStockVariations.length > 0 ? inStockVariations : variations).map((variation: any) => variation.size),
      inStock: variations.some((variation: any) => Number(variation.stock || 0) > 0),
      isFeatured: Boolean(row.isFeatured),
      featuredSections: row.featuredSections || [],
    };
  };

  const fetchRelatedProducts = async (currentProduct: ReadyToWearProduct) => {
    try {
      const primary = await api.products.getReadyToWear({
        categoryId: currentProduct.category?.id || undefined,
        country: currentProduct.designer?.country || undefined,
        page: 1,
        limit: 12,
      });
      const fallback = await api.products.getReadyToWear({
        categoryId: currentProduct.category?.id || undefined,
        page: 1,
        limit: 12,
      });
      const merged = [
        ...(primary.success ? primary.data?.products || [] : []),
        ...(fallback.success ? fallback.data?.products || [] : []),
      ];
      const unique = new Map<string, ReadyToWearProduct>();
      for (const row of merged) {
        const mapped = mapReadyToWearRow(row);
        if (mapped.id === currentProduct.id) continue;
        if (!unique.has(mapped.id)) unique.set(mapped.id, mapped);
      }
      setRelatedProducts(Array.from(unique.values()).slice(0, 4));
    } catch (relatedError) {
      console.error('Failed to load related ready-to-wear:', relatedError);
      setRelatedProducts([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Product not found'}</p>
          <Link to="/ready-to-wear" className="text-coral-500 hover:underline">
            Back to Ready To Wear
          </Link>
        </div>
      </div>
    );
  }

  const flag = countryFlags[product.designer?.country] || '🌍';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={product.images?.[0]?.url || '/images/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/25" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-6 md:pb-8">
            <Link to="/ready-to-wear" className="inline-flex items-center text-white/90 hover:text-white transition-colors mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ready To Wear
            </Link>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-coral-300 uppercase">Ready To Wear</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white line-clamp-2">{product.name}</h1>
            <p className="text-sm md:text-base text-white/80 mt-1">{product.category?.name || 'Ready To Wear'}</p>
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
          <div className="space-y-4">
            <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '4/5' }}>
              <img
                src={product.images?.[selectedImage]?.url || '/images/placeholder.jpg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />

              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((previous) => (previous === 0 ? product.images.length - 1 : previous - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((previous) => (previous === product.images.length - 1 ? 0 : previous + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Sale
                </div>
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

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-coral-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">{product.category?.name || 'Ready To Wear'}</Badge>
                  {product.isFeatured && <Badge variant="purple">Featured</Badge>}
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-coral-500 text-coral-500" />
                  <span className="font-medium">{product.designer?.rating || 0}</span>
                  <span className="text-gray-500">({product.designer?.reviewCount || 0} reviews)</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {product.designer?.country || 'Unknown'}
                </span>
                {product.inStock && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      In Stock
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <div className="w-14 h-14 bg-coral-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">{flag}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.designer?.businessName || 'Unknown Designer'}</h3>
                <p className="text-sm text-gray-500">Ready-to-wear designer</p>
              </div>
              {product.designer?.id ? (
                <Link to={`/store/designer/${product.designer.id}`}>
                  <Button variant="outline" size="sm">View Store</Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>View Store</Button>
              )}
            </div>

            <div className="p-4 bg-coral-50 rounded-xl border border-coral-100">
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-coral-600">{formatFromUsd(product.price)}</p>
                {hasDiscount && (
                  <p className="text-xl text-gray-400 line-through">{formatFromUsd(Number(product.originalPrice || 0))}</p>
                )}
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            {product.colors && product.colors.length > 0 && (
              <div>
                <span className="font-medium">Color: {selectedColor}</span>
                <div className="flex gap-2 mt-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border rounded-lg text-sm ${
                        selectedColor === color
                          ? 'border-coral-500 bg-coral-50 text-coral-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div>
                <span className="font-medium">Size: {selectedSize}</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 border rounded-lg font-medium ${
                        selectedSize === size
                          ? 'border-coral-500 bg-coral-50 text-coral-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center border rounded-lg bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="px-4 py-2 font-medium w-16 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-coral-500">{formatFromUsd(product.price * quantity)}</span>
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
              {product.material && (
                <div>
                  <p className="font-medium">Material</p>
                  <p className="text-sm text-gray-500">{product.material}</p>
                </div>
              )}
              {product.careInstructions && (
                <div>
                  <p className="font-medium">Care Instructions</p>
                  <p className="text-sm text-gray-500">{product.careInstructions}</p>
                </div>
              )}
              {product.shippingInfo && (
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Shipping</p>
                    <p className="text-sm text-gray-500">{product.shippingInfo}</p>
                  </div>
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
              <h2 className="text-2xl font-bold text-gray-900">Related Ready To Wear</h2>
              <p className="text-sm text-gray-500">Suggested from the same category and country.</p>
            </div>
            <Link
              to={`/ready-to-wear${product.category?.id ? `?category=${encodeURIComponent(product.category.id)}` : ''}`}
              className="text-sm font-medium text-coral-600 hover:text-coral-700"
            >
              View all
            </Link>
          </div>
          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((item) => (
                <Link key={item.id} to={`/ready-to-wear/${item.id}`} className="group bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-100 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                    <img
                      src={item.images?.[0]?.url || '/images/placeholder.jpg'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.designer?.businessName}</p>
                    <p className="text-sm font-semibold text-coral-600 mt-1">{formatFromUsd(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-4 text-sm text-gray-600">
              Related products will appear as matching ready-to-wear products are added.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
