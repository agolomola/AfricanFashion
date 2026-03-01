import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart, Star, MapPin, Truck, Check } from 'lucide-react';
import Button from '../components/ui/Button';

// Sample product data
const sampleProduct = {
  id: '1',
  name: 'Kente Shift Dress',
  description: 'A modern take on traditional Kente fashion. This elegant shift dress features authentic Kente patterns woven into a contemporary silhouette. Perfect for both formal events and casual outings. The breathable cotton fabric ensures all-day comfort while the vibrant colors make a bold statement.',
  price: 185,
  originalPrice: 220,
  images: [
    { url: '/images/readytowear/kente-shift.jpg' },
    { url: '/images/readytowear/kente-shift-2.jpg' },
    { url: '/images/readytowear/kente-shift-3.jpg' },
  ],
  designer: {
    id: 'd1',
    businessName: 'Amma Designs',
    country: 'Ghana',
    rating: 4.9,
    reviewCount: 234,
  },
  category: { id: 'c1', name: 'Dresses' },
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  flag: '🇬🇭',
  colors: ['Multi', 'Gold/Green', 'Red/Black'],
  material: '100% Cotton Kente',
  careInstructions: 'Hand wash cold, hang dry. Do not bleach.',
  shippingInfo: 'Ships from Accra, Ghana. 3-5 business days worldwide.',
  inStock: true,
};

export default function ReadyToWearDetail() {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Multi');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const product = sampleProduct;

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
            <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden relative">
              <img
                src={product.images[selectedImage]?.url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 right-4 w-12 h-12 flex items-center justify-center bg-white/90 rounded-full">
                <span className="text-3xl">{product.flag}</span>
              </div>
              {product.originalPrice > product.price && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Sale
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === idx ? 'border-coral-500' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                {product.designer.country}
                <span className="mx-2">•</span>
                <span>{product.category.name}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-medium">{product.designer.rating}</span>
                  <span className="text-gray-500">({product.designer.reviewCount} reviews)</span>
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
              <p className="text-3xl font-bold text-coral-500">${product.price}</p>
              {product.originalPrice > product.price && (
                <p className="text-xl text-gray-400 line-through">${product.originalPrice}</p>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            {/* Color Selection */}
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

            {/* Size Selection */}
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
                  <span className="text-2xl">{product.flag}</span>
                </div>
                <div>
                  <p className="font-medium">{product.designer.businessName}</p>
                  <p className="text-sm text-gray-500">{product.designer.country}</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="border-t pt-6 space-y-3">
              <div>
                <p className="font-medium">Material</p>
                <p className="text-sm text-gray-500">{product.material}</p>
              </div>
              <div>
                <p className="font-medium">Care Instructions</p>
                <p className="text-sm text-gray-500">{product.careInstructions}</p>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Shipping</p>
                  <p className="text-sm text-gray-500">{product.shippingInfo}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
