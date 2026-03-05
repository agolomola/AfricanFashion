import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, Loader2, SlidersHorizontal, X, Heart } from 'lucide-react';
import { api } from '../services/api';
import Button from '../components/ui/Button';

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
    images: [{ url: '/images/fabrics/adire.jpg' }],
    seller: { id: 's8', businessName: 'Abeokuta Dyers', country: 'Nigeria' },
    materialType: { id: 'm4', name: 'Indigo Cotton' },
    flag: '🇳🇬',
  },
];

export default function Fabrics() {
  const [fabrics, setFabrics] = useState<Fabric[]>(sampleFabrics);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img
          src="/images/hero-fabrics.jpg"
          alt="African Fabrics"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.5), transparent)' }} />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                African Fabrics
              </h1>
              <p className="text-lg text-white text-opacity-80">
                Premium textiles from across the continent. Kente, Ankara, Aso Oke, and more.
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
                placeholder="Search fabrics..."
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
            {fabrics.map((fabric) => (
              <Link key={fabric.id} to={`/fabrics/${fabric.id}`} className="group">
                <div className="bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                  <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                    <img
                      src={fabric.images?.[0]?.url || '/placeholder.jpg'}
                      alt={fabric.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center z-10">
                      <span className="text-2xl drop-shadow-lg">{fabric.flag}</span>
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
                    <p className="text-coral-500 font-semibold mt-2">${fabric.pricePerMeter}/meter</p>
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
