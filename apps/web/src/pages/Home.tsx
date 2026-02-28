import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star, Truck, Shield, Clock } from 'lucide-react';
import { productsApi } from '../services/api';

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80',
    title: 'Wear the Story',
    subtitle: 'Discover authentic African fashion — from heritage prints to modern silhouettes',
  },
  {
    image: 'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=1920&q=80',
    title: 'Fresh Drops',
    subtitle: 'New arrivals from the most talented designers across the continent',
  },
  {
    image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=1920&q=80',
    title: 'Trending Now',
    subtitle: 'The pieces everyone is talking about this season',
  },
];

const features = [
  { icon: Truck, title: 'Fast Shipping', description: 'Delivered to your door in 7-14 days' },
  { icon: Shield, title: 'Quality Guaranteed', description: 'Every piece inspected by our QA team' },
  { icon: Clock, title: 'Custom Made', description: 'Tailored to your exact measurements' },
];

const countries = [
  { name: 'Ghana', flag: '🇬🇭', fabrics: ['Kente', 'Adinkra'] },
  { name: 'Nigeria', flag: '🇳🇬', fabrics: ['Ankara', 'Aso Oke'] },
  { name: 'Kenya', flag: '🇰🇪', fabrics: ['Kitenge', 'Kikoy'] },
  { name: 'Senegal', flag: '🇸🇳', fabrics: ['Boubou', 'Lace'] },
  { name: 'Ethiopia', flag: '🇪🇹', fabrics: ['Tibeb', 'Cotton'] },
  { name: 'Morocco', flag: '🇲🇦', fabrics: ['Caftan', 'Silk'] },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<any>({ fabrics: [], designs: [], readyToWear: [] });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    productsApi.getFeatured().then((res) => {
      if (res.success) {
        setFeaturedProducts(res.data);
      }
    });
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-screen overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          </div>
        ))}

        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              {heroSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`transition-all duration-700 ${
                    index === currentSlide
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-8 absolute'
                  }`}
                >
                  <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white font-bold mb-6 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 mb-10 max-w-lg">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link to="/designs" className="btn-primary">
                      Shop New Arrivals
                    </Link>
                    <Link to="/designs" className="btn-outline">
                      Explore Collections
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-coral-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Designs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-coral-500 font-semibold text-sm tracking-wider uppercase mb-3 block">
                New Arrivals
              </span>
              <h2 className="font-display text-4xl text-navy-600 font-bold">Featured Designs</h2>
            </div>
            <Link to="/designs" className="flex items-center gap-2 text-navy-600 font-medium hover:text-coral-500 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.designs?.slice(0, 4).map((design: any) => (
              <Link key={design.id} to={`/designs/${design.id}`} className="group">
                <div className="card">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={design.images?.[0]?.url || '/placeholder.jpg'}
                      alt={design.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                      {design.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{design.designer?.businessName}</p>
                    <p className="text-coral-500 font-semibold mt-2">${design.finalPrice}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Country */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-coral-500 font-semibold text-sm tracking-wider uppercase mb-3 block">
              Explore
            </span>
            <h2 className="font-display text-4xl text-navy-600 font-bold mb-4">Shop by Country</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Explore traditional prints and textiles from every region of the continent
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {countries.map((country) => (
              <Link
                key={country.name}
                to={`/fabrics?country=${country.name}`}
                className="bg-white rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <span className="text-5xl mb-4 block">{country.flag}</span>
                <h3 className="font-display font-bold text-navy-600 text-lg mb-2">{country.name}</h3>
                <p className="text-sm text-gray-500">{country.fabrics.join(', ')}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Fabrics */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-coral-500 font-semibold text-sm tracking-wider uppercase mb-3 block">
                Premium Materials
              </span>
              <h2 className="font-display text-4xl text-navy-600 font-bold">Featured Fabrics</h2>
            </div>
            <Link to="/fabrics" className="flex items-center gap-2 text-navy-600 font-medium hover:text-coral-500 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.fabrics?.slice(0, 4).map((fabric: any) => (
              <Link key={fabric.id} to={`/fabrics/${fabric.id}`} className="group">
                <div className="card">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={fabric.images?.[0]?.url || '/placeholder.jpg'}
                      alt={fabric.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                      {fabric.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{fabric.materialType?.name}</p>
                    <p className="text-coral-500 font-semibold mt-2">${fabric.finalPrice}/yard</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-navy-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-white font-bold mb-6">
            Are You a Designer or Fabric Seller?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            Join our platform and reach customers worldwide. Showcase your designs, sell your fabrics, and grow your business.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn-primary">
              Become a Seller
            </Link>
            <Link to="/register" className="btn-outline">
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
