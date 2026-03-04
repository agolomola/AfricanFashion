import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star, Truck, Shield, Clock, Heart, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useQuery } from '@tanstack/react-query';

// Static data that doesn't change
const features = [
  { icon: Truck, title: 'Fast Shipping', description: 'Delivered to your door in 7-14 days' },
  { icon: Shield, title: 'Quality Guaranteed', description: 'Every piece inspected by our QA team' },
  { icon: Clock, title: 'Custom Made', description: 'Tailored to your exact measurements' },
];

// Default countries as fallback
const defaultCountries = [
  { name: 'Ghana', flag: '🇬🇭', image: '/images/ghana-abstract.jpg', fabrics: 'Kente, Adinkra' },
  { name: 'Nigeria', flag: '🇳🇬', image: '/images/nigeria-abstract.jpg', fabrics: 'Ankara, Aso Oke' },
  { name: 'Kenya', flag: '🇰🇪', image: '/images/kenya-abstract.jpg', fabrics: 'Kitenge, Kikoy' },
  { name: 'Senegal', flag: '🇸🇳', image: '/images/senegal-abstract.jpg', fabrics: 'Boubou, Lace' },
  { name: 'Ethiopia', flag: '🇪🇹', image: '/images/ethiopia-abstract.jpg', fabrics: 'Tibeb, Cotton' },
  { name: 'Morocco', flag: '🇲🇦', image: '/images/morocco-abstract.jpg', fabrics: 'Caftan, Silk' },
];

// Default testimonials as fallback
const defaultTestimonials = [
  {
    id: '1',
    name: 'Amara Johnson',
    location: 'New York, USA',
    avatar: '/images/avatar-1.jpg',
    rating: 5,
    text: 'The quality exceeded my expectations. My custom dress fits perfectly and the fabric is beautiful!',
  },
  {
    id: '2',
    name: 'Kwame Asante',
    location: 'London, UK',
    avatar: '/images/avatar-2.jpg',
    rating: 5,
    text: 'Amazing experience from start to finish. The virtual try-on feature helped me choose the perfect design.',
  },
  {
    id: '3',
    name: 'Zainab Mohammed',
    location: 'Toronto, Canada',
    avatar: '/images/avatar-3.jpg',
    rating: 5,
    text: 'Supporting African designers while getting unique pieces. This platform is a game changer!',
  },
];

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string | null;
  ctaLink: string | null;
}

interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  designer: string;
  country: string;
  productType: string;
}

// Default hero slides as fallback
const defaultHeroSlides: HeroSlide[] = [
  {
    id: '1',
    image: '/images/hero-1.jpg',
    title: 'Wear the Story',
    subtitle: 'Discover authentic African fashion — from heritage prints to modern silhouettes',
    ctaText: 'Shop Now',
    ctaLink: '/designs',
  },
  {
    id: '2',
    image: '/images/hero-2.jpg',
    title: 'Fresh Drops',
    subtitle: 'New arrivals from the most talented designers across the continent',
    ctaText: 'Explore',
    ctaLink: '/ready-to-wear',
  },
  {
    id: '3',
    image: '/images/hero-3.jpg',
    title: 'Trending Now',
    subtitle: 'The pieces everyone is talking about this season',
    ctaText: 'View Trending',
    ctaLink: '/designs',
  },
];

// Default featured products as fallback
const defaultFeaturedDesigns: FeaturedProduct[] = [
  { id: '1', name: 'Royal Kente Gown', description: '', price: 299, image: '/images/design-1.jpg', designer: 'Amma Designs', country: 'Ghana', productType: 'DESIGN' },
  { id: '2', name: 'Ankara Maxi Dress', description: '', price: 189, image: '/images/design-2.jpg', designer: 'Lagos Luxe', country: 'Nigeria', productType: 'DESIGN' },
  { id: '3', name: 'Kitenge Two-Piece', description: '', price: 159, image: '/images/design-3.jpg', designer: 'Nairobi Styles', country: 'Kenya', productType: 'DESIGN' },
  { id: '4', name: 'Boubou Silk Set', description: '', price: 349, image: '/images/design-4.jpg', designer: 'Dakar Elegance', country: 'Senegal', productType: 'DESIGN' },
  { id: '5', name: 'Embroidered Dashiki', description: '', price: 219, image: '/images/design-5.jpg', designer: 'Accra Heritage', country: 'Ghana', productType: 'DESIGN' },
  { id: '6', name: 'African Fusion Gown', description: '', price: 399, image: '/images/design-6.jpg', designer: 'Modern Africa', country: 'Nigeria', productType: 'DESIGN' },
];

const defaultFeaturedFabrics: FeaturedProduct[] = [
  { id: 'f1', name: 'Premium Kente Cloth', description: '', price: 45, image: '/images/fabric-1.jpg', designer: 'Ghana Textiles', country: 'Ghana', productType: 'FABRIC' },
  { id: 'f2', name: 'Luxury Ankara Print', description: '', price: 35, image: '/images/fabric-2.jpg', designer: 'Nigerian Fabrics', country: 'Nigeria', productType: 'FABRIC' },
  { id: 'f3', name: 'Authentic Mud Cloth', description: '', price: 55, image: '/images/fabric-3.jpg', designer: 'Mali Traditions', country: 'Mali', productType: 'FABRIC' },
  { id: 'f4', name: 'Kitenge Wax Print', description: '', price: 30, image: '/images/fabric-4.jpg', designer: 'Kenya Fabrics', country: 'Kenya', productType: 'FABRIC' },
];

const defaultFeaturedRTW: FeaturedProduct[] = [
  { id: 'r1', name: 'Classic Ankara Blazer', description: '', price: 149, image: '/images/rtw-1.jpg', designer: 'Lagos Luxe', country: 'Nigeria', productType: 'READY_TO_WEAR' },
  { id: 'r2', name: 'Kente Print Shirt', description: '', price: 89, image: '/images/rtw-2.jpg', designer: 'Accra Styles', country: 'Ghana', productType: 'READY_TO_WEAR' },
  { id: 'r3', name: 'African Print Skirt', description: '', price: 119, image: '/images/rtw-3.jpg', designer: 'Nairobi Chic', country: 'Kenya', productType: 'READY_TO_WEAR' },
  { id: 'r4', name: 'Boubou Style Top', description: '', price: 79, image: '/images/rtw-4.jpg', designer: 'Dakar Fashion', country: 'Senegal', productType: 'READY_TO_WEAR' },
];

// Country flag mapping
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

export default function Home() {
  // Fetch hero slides
  const { data: heroSlidesData, isLoading: heroLoading } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: async () => {
      const response = await api.homepage.getHeroSlides();
      return response.success ? response.data : defaultHeroSlides;
    },
  });

  // Fetch all featured sections
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      const response = await api.homepage.getAllFeatured();
      return response.success ? response.data : null;
    },
  });

  const heroSlides = heroSlidesData || defaultHeroSlides;
  const featuredDesigns = featuredData?.FEATURED_DESIGNS || defaultFeaturedDesigns;
  const featuredFabrics = featuredData?.FEATURED_FABRICS || defaultFeaturedFabrics;
  const featuredRTW = featuredData?.FEATURED_READY_TO_WEAR || defaultFeaturedRTW;

  // Fetch countries dynamically
  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await api.homepageSections.getCountries();
      return response.success ? response.data : null;
    },
  });

  // Fetch testimonials dynamically
  const { data: testimonialsData } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await api.homepageSections.getTestimonials();
      return response.success ? response.data : null;
    },
  });

  // Use dynamic data or fallback to defaults
  const countries = countriesData?.length > 0 
    ? countriesData.map((c: any) => ({ 
        name: c.name, 
        flag: c.flag, 
        image: c.image, 
        fabrics: c.fabrics 
      })) 
    : defaultCountries;
    
  const testimonials = testimonialsData?.length > 0 
    ? testimonialsData.map((t: any) => ({ 
        id: t.id, 
        name: t.name, 
        location: t.location, 
        avatar: t.avatar, 
        rating: t.rating, 
        text: t.text 
      })) 
    : defaultTestimonials;

  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  // Product card component
  const ProductCard = ({ product }: { product: FeaturedProduct }) => (
    <Link
      to={`/${product.productType === 'DESIGN' ? 'designs' : product.productType === 'FABRIC' ? 'fabrics' : 'ready-to-wear'}/${product.id}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 bg-white rounded-full shadow-md hover:bg-coral-50">
            <Heart className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="absolute bottom-3 right-3 text-2xl">
          {countryFlags[product.country] || '🌍'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-coral-600 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{product.designer}</p>
        <p className="font-bold text-coral-600 mt-2">${product.price}</p>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen">
      {/* Hero Carousel */}
      <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-transparent" />
            </div>
            <div className="relative h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-xl text-white">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-4 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white mb-8">
                    {slide.subtitle}
                  </p>
                  {slide.ctaText && slide.ctaLink && (
                    <Link
                      to={slide.ctaLink}
                      className="inline-flex items-center gap-2 bg-coral-500 hover:bg-coral-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    >
                      {slide.ctaText}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-20 hover:bg-white bg-opacity-30 backdrop-blur-sm rounded-full text-white transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-20 hover:bg-white bg-opacity-30 backdrop-blur-sm rounded-full text-white transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="p-3 bg-coral-50 rounded-xl">
                  <feature.icon className="w-6 h-6 text-coral-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Designs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Designs</h2>
              <p className="text-gray-500 mt-1">Handpicked custom designs from top African designers</p>
            </div>
            <Link
              to="/designs"
              className="hidden sm:inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {featuredDesigns.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/designs"
              className="inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium"
            >
              View All Designs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Fabrics */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Fabrics</h2>
              <p className="text-gray-500 mt-1">Premium African textiles from verified sellers</p>
            </div>
            <Link
              to="/fabrics"
              className="hidden sm:inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredFabrics.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/fabrics"
              className="inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium"
            >
              View All Fabrics
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Ready To Wear */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Ready To Wear</h2>
              <p className="text-gray-500 mt-1">Stunning pieces ready to ship</p>
            </div>
            <Link
              to="/ready-to-wear"
              className="hidden sm:inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredRTW.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/ready-to-wear"
              className="inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium"
            >
              View All Ready To Wear
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Countries */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Explore by Country</h2>
            <p className="text-gray-500 mt-2">Discover unique styles from across Africa</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {countries.map((country) => (
              <Link
                key={country.name}
                to={`/designs?country=${country.name}`}
                className="group relative aspect-square rounded-xl overflow-hidden"
              >
                <img
                  src={country.image}
                  alt={country.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-2xl">{country.flag}</span>
                  <h3 className="font-semibold mt-1">{country.name}</h3>
                  <p className="text-xs text-white">{country.fabrics}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-navy-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white">What Our Customers Say</h2>
            <p className="text-white mt-2">Join thousands of happy customers worldwide</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-white">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-coral-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Wear African Fashion?
          </h2>
          <p className="text-white text-lg mb-8">
            Join our community of fashion lovers and discover unique pieces from talented African designers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/designs"
              className="inline-flex items-center justify-center gap-2 bg-white text-coral-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-coral-600 text-white border-2 border-white px-8 py-4 rounded-full font-semibold hover:bg-coral-700 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
