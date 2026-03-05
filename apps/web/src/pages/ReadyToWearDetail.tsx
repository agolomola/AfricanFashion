import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart, Star, MapPin, Truck, Check, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Breadcrumb */}
        <Link to="/ready-to-wear" className="inline-flex items-center text-gray-500 hover:text-coral-500 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ready to Wear
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="bg-gray-100 overflow-hidden relative" style={{ aspectRatio: '3/4' }}>
              <img
                src={product.images?.[selectedImage]?.url || '/images/placeholder.jpg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 right-4 w-12 h-12 flex items-center justify-center bg-white bg-opacity-90">
                <span className="text-3xl">{flag}</span>
              </div>
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Sale
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 overflow-hidden border-2 ${
                      selectedImage === idx ? 'border-coral-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                {product.designer?.country || 'Unknown'}
                <span className="mx-2">•</span>
                <span>{product.category?.name || 'Ready To Wear'}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              {product.isFeatured && (
                <div className="mt-2">
                  <Badge variant="purple">Featured</Badge>
                </div>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-medium">{product.designer?.rating || 0}</span>
                  <span className="text-gray-500">({product.designer?.reviewCount || 0} reviews)</span>
                </div>
                {product.inStock && (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <Check className="w-4 h-4" />
                    In Stock
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold text-coral-500">{formatFromUsd(product.price)}</p>
              {hasDiscount && (
                <p className="text-xl text-gray-400 line-through">{formatFromUsd(Number(product.originalPrice || 0))}</p>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            {/* Color Selection */}
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

            {/* Size Selection */}
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

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center border rounded-lg">
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

            {/* Total */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-coral-500">${(product.price * quantity).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
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

            {/* Designer Info */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Designed by</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">{flag}</span>
                </div>
                <div>
                  <p className="font-medium">{product.designer?.businessName || 'Unknown Designer'}</p>
                  <p className="text-sm text-gray-500">{product.designer?.country || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Info */}
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
    </div>
  );
}
