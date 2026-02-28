import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star, Truck, Shield, Clock, Sparkles, MapPin, Heart } from 'lucide-react';

// Hero slides with generated African fashion images
const heroSlides = [
  {
    image: '/images/hero-1.jpg',
    title: 'Wear the Story',
    subtitle: 'Discover authentic African fashion — from heritage prints to modern silhouettes',
  },
  {
    image: '/images/hero-2.jpg',
    title: 'Fresh Drops',
    subtitle: 'New arrivals from the most talented designers across the continent',
  },
  {
    image: '/images/hero-3.jpg',
    title: 'Trending Now',
    subtitle: 'The pieces everyone is talking about this season',
  },
];

const features = [
  { icon: Truck, title: 'Fast Shipping', description: 'Delivered to your door in 7-14 days' },
  { icon: Shield, title: 'Quality Guaranteed', description: 'Every piece inspected by our QA team' },
  { icon: Clock, title: 'Custom Made', description: 'Tailored to your exact measurements' },
];

// Countries with abstract images and fabric info
const countries = [
  { name: 'Ghana', flag: '🇬🇭', image: '/images/country-ghana.jpg', fabrics: 'Kente, Adinkra' },
  { name: 'Nigeria', flag: '🇳🇬', image: '/images/country-nigeria.jpg', fabrics: 'Ankara, Aso Oke' },
  { name: 'Kenya', flag: '🇰🇪', image: '/images/country-kenya.jpg', fabrics: 'Kitenge, Kikoy' },
  { name: 'Senegal', flag: '🇸🇳', image: '/images/country-senegal.jpg', fabrics: 'Boubou, Lace' },
  { name: 'Ethiopia', flag: '🇪🇹', image: '/images/country-ethiopia.jpg', fabrics: 'Tibeb, Cotton' },
  { name: 'Morocco', flag: '🇲🇦', image: '/images/country-morocco.jpg', fabrics: 'Caftan, Silk' },
];

// Featured designs with generated African clothing images (3 columns x 2 rows = 6 items)
const featuredDesigns = [
  {
    id: '1',
    name: 'Royal Kente Gown',
    designer: 'Amma Designs',
    price: 299,
    image: '/images/design-1.jpg',
  },
  {
    id: '2',
    name: 'Ankara Maxi Dress',
    designer: 'Lagos Luxe',
    price: 189,
    image: '/images/design-2.jpg',
  },
  {
    id: '3',
    name: 'Kitenge Two-Piece',
    designer: 'Nairobi Styles',
    price: 159,
    image: '/images/design-3.jpg',
  },
  {
    id: '4',
    name: 'Boubou Silk Set',
    designer: 'Dakar Elegance',
    price: 349,
    image: '/images/design-4.jpg',
  },
  {
    id: '5',
    name: 'Embroidered Dashiki',
    designer: 'Accra Heritage',
    price: 219,
    image: '/images/design-5.jpg',
  },
  {
    id: '6',
    name: 'African Fusion Gown',
    designer: 'Modern Africa',
    price: 399,
    image: '/images/design-6.jpg',
  },
];

// Featured Ready To Wear items with generated African clothing
const featuredReadyToWear = [
  {
    id: 'rtw1',
    name: 'Classic Ankara Blazer',
    designer: 'Lagos Luxe',
    price: 149,
    image: '/images/rtw-1.jpg',
  },
  {
    id: 'rtw2',
    name: 'Kente Print Shirt',
    designer: 'Accra Styles',
    price: 89,
    image: '/images/rtw-2.jpg',
  },
  {
    id: 'rtw3',
    name: 'African Print Skirt',
    designer: 'Nairobi Chic',
    price: 119,
    image: '/images/rtw-3.jpg',
  },
  {
    id: 'rtw4',
    name: 'Boubou Style Top',
    designer: 'Dakar Fashion',
    price: 79,
    image: '/images/rtw-4.jpg',
  },
];

// Featured fabrics with generated African textile images
const featuredFabrics = [
  {
    id: '1',
    name: 'Premium Kente Cloth',
    material: 'Cotton Blend',
    price: 45,
    image: '/images/fabric-1.jpg',
  },
  {
    id: '2',
    name: 'Vibrant Ankara Print',
    material: '100% Cotton',
    price: 25,
    image: '/images/fabric-2.jpg',
  },
  {
    id: '3',
    name: 'Ethiopian Tibeb',
    material: 'Handwoven Cotton',
    price: 65,
    image: '/images/fabric-3.jpg',
  },
  {
    id: '4',
    name: 'Moroccan Silk',
    material: 'Pure Silk',
    price: 89,
    image: '/images/fabric-4.jpg',
  },
];

// Testimonials with generated customer avatars
const testimonials = [
  {
    name: 'Sarah Johnson',
    location: 'New York, USA',
    text: 'The quality of the fabrics exceeded my expectations. My custom dress fits perfectly!',
    rating: 5,
    avatar: '/images/avatar-1.jpg',
  },
  {
    name: 'Michael Adeyemi',
    location: 'London, UK',
    text: 'Amazing platform connecting me with talented African designers. Highly recommend!',
    rating: 5,
    avatar: '/images/avatar-2.jpg',
  },
  {
    name: 'Amina Diallo',
    location: 'Paris, France',
    text: 'The 3D try-on feature helped me visualize my outfit before ordering. Brilliant!',
    rating: 5,
    avatar: '/images/avatar-3.jpg',
  },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  // Manual scroll functions for Shop by Country
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center scale-105"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
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
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-coral-400" />
                    <span className="text-coral-400 font-medium tracking-wider uppercase text-sm">
                      African Fashion Marketplace
                    </span>
                  </div>
                  <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white font-bold mb-6 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 mb-10 max-w-lg">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link to="/designs" className="btn-primary">
                      Shop New Arrivals
                      <ArrowRight className="w-5 h-5 ml-2" />
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
              className={`h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-coral-500 w-8' : 'bg-white/50 hover:bg-white/70 w-3'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features Bar */}
      <section className="py-12 bg-white border-b border-gray-100">
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

      {/* Shop by Country - Horizontal Scrolling with Arrows */}
      <section className="py-12 bg-cream overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Left Arrow */}
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-coral-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-coral-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* Scroll Container - increased width, reduced height, more spacing */}
          <div
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto scrollbar-hide scroll-smooth px-12"
            style={{ scrollBehavior: 'smooth' }}
          >
            {countries.map((country) => (
              <Link
                key={country.name}
                to={`/fabrics?country=${country.name}`}
                className="flex-shrink-0 relative w-72 h-44 rounded-2xl overflow-hidden group transition-transform duration-300 hover:scale-105 shadow-md"
              >
                <img
                  src={country.image}
                  alt={country.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                {/* Flag in top left corner */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="text-3xl">{country.flag}</span>
                </div>
                {/* Country name and fabrics at bottom */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display font-bold text-white text-lg">{country.name}</h3>
                  <p className="text-white/80 text-xs">{country.fabrics}</p>
                </div>
              </Link>
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDesigns.map((design) => (
              <Link key={design.id} to={`/designs/${design.id}`} className="group">
                <div className="card">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img
                      src={design.image}
                      alt={design.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-500 hover:text-white">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                      {design.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{design.designer}</p>
                    <p className="text-coral-500 font-semibold mt-2">${design.price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Ready To Wear */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-coral-500 font-semibold text-sm tracking-wider uppercase mb-3 block">
                New Arrivals
              </span>
              <h2 className="font-display text-4xl text-navy-600 font-bold">Featured Ready To Wear</h2>
            </div>
            <Link to="/ready-to-wear" className="flex items-center gap-2 text-navy-600 font-medium hover:text-coral-500 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredReadyToWear.map((item) => (
              <Link key={item.id} to={`/ready-to-wear/${item.id}`} className="group">
                <div className="card">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-500 hover:text-white">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{item.designer}</p>
                    <p className="text-coral-500 font-semibold mt-2">${item.price}</p>
                  </div>
                </div>
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
            {featuredFabrics.map((fabric) => (
              <Link key={fabric.id} to={`/fabrics/${fabric.id}`} className="group">
                <div className="card">
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={fabric.image}
                      alt={fabric.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">
                      {fabric.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{fabric.material}</p>
                    <p className="text-coral-500 font-semibold mt-2">${fabric.price}/yard</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-navy-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-coral-400 font-semibold text-sm tracking-wider uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="font-display text-4xl text-white font-bold">Your Custom Fashion Journey</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Choose Design', desc: 'Browse designs from talented African designers' },
              { step: '02', title: 'Select Fabric', desc: 'Pick premium fabrics from verified sellers' },
              { step: '03', title: 'Virtual Try-On', desc: 'See how it looks on you with our 3D tool' },
              { step: '04', title: 'Receive Order', desc: 'Get your custom-made piece delivered' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-coral-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">{item.step}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-coral-500 font-semibold text-sm tracking-wider uppercase mb-3 block">
              Testimonials
            </span>
            <h2 className="font-display text-4xl text-navy-600 font-bold">What Our Customers Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-coral-500 to-coral-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-white font-bold mb-6">
            Are You a Designer or Fabric Seller?
          </h2>
          <p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
            Join our platform and reach customers worldwide. Showcase your designs, sell your fabrics, and grow your business.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="inline-flex items-center px-8 py-4 bg-white text-coral-500 font-semibold rounded-full hover:bg-white/90 transition-colors">
              Become a Seller
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link to="/register" className="inline-flex items-center px-8 py-4 bg-transparent text-white font-medium rounded-full border-2 border-white/50 hover:bg-white/10 transition-colors">
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
