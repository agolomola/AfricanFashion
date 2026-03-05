import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, Heart } from 'lucide-react';
import Button from '../components/ui/Button';

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
    name: 'Zulu Print Maxi',
    description: 'Elegant maxi dress in Zulu patterns',
    price: 220,
    images: [{ url: '/images/readytowear/zulu-maxi.jpg' }],
    designer: { id: 'd8', businessName: 'Zulu Heritage', country: 'South Africa' },
    category: { id: 'c1', name: 'Dresses' },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    flag: '🇿🇦',
  },
];

export default function ReadyToWear() {
  const [products] = useState<Product[]>(sampleProducts);
  const [isLoading] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img
          src="/images/hero-readytowear.jpg"
          alt="Ready to Wear"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/80 via-navy-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                Ready to Wear
              </h1>
              <p className="text-lg text-white/80">
                Fashion-forward pieces ready to ship. No waiting, just style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ready to wear..."
                className="w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-coral-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link key={product.id} to={`/ready-to-wear/${product.id}`} className="group">
                <div className="bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <div className="aspect-[3/4] overflow-hidden relative bg-gray-100">
                    <img
                      src={product.images?.[0]?.url || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center z-10">
                      <span className="text-2xl drop-shadow-lg">{product.flag}</span>
                    </div>
                    <button 
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-500 hover:text-white"
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
                    <p className="text-coral-500 font-semibold mt-2">${product.price}</p>
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
        )}
      </div>
    </div>
  );
}
