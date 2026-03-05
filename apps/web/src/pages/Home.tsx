import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star, Heart, Loader2, Search, Eye, CreditCard, CheckCircle, Truck } from 'lucide-react';
import { api, resolveAssetUrl } from '../services/api';
import { useQuery } from '@tanstack/react-query';

// Default countries as fallback
const defaultCountries = [
  { name: 'Ghana', flag: '🇬🇭', image: '/images/ghana-abstract.jpg', fabrics: 'Kente • Adinkra • Batik' },
  { name: 'Nigeria', flag: '🇳🇬', image: '/images/nigeria-abstract.jpg', fabrics: 'Ankara • Aso Oke • Adire' },
  { name: 'Kenya', flag: '🇰🇪', image: '/images/kenya-abstract.jpg', fabrics: 'Kitenge • Kikoy • Shuka' },
  { name: 'Senegal', flag: '🇸🇳', image: '/images/senegal-abstract.jpg', fabrics: 'Bazin • Mud Cloth • Wax Print' },
  { name: 'South Africa', flag: '🇿🇦', image: '/images/south-africa-abstract.jpg', fabrics: 'Shweshwe • Ndebele • Zulu' },
  { name: 'Tanzania', flag: '🇹🇿', image: '/images/tanzania-abstract.jpg', fabrics: 'Kanga • Kitenge • Tie Dye' },
  { name: 'Ethiopia', flag: '🇪🇹', image: '/images/ethiopia-abstract.jpg', fabrics: 'Tibeb • Netela • Cotton' },
  { name: 'Morocco', flag: '🇲🇦', image: '/images/morocco-abstract.jpg', fabrics: 'Caftan • Djellaba • Silk' },
];

// How It Works steps
const howItWorksSteps = [
  { icon: Search, title: 'Discover Your Style', subtitle: 'Browse curated designs from top African creators.' },
  { icon: Eye, title: 'Preview Virtually', subtitle: 'Use virtual preview to visualize your look before checkout.' },
  { icon: Heart, title: 'Select Your Fabric', subtitle: 'Choose premium textiles that match your design perfectly.' },
  { icon: CreditCard, title: 'Pay Securely', subtitle: 'Checkout safely with trusted payment options.' },
  { icon: CheckCircle, title: 'Quality Assured', subtitle: 'Every order is reviewed by QA before shipment.' },
  { icon: Truck, title: 'Delivered to You', subtitle: 'Track your order and receive it at your doorstep.' },
];
const howItWorksIconMap: Record<string, any> = {
  Search,
  Eye,
  Heart,
  CreditCard,
  CheckCircle,
  Truck,
};

// Shop by Category
const shopCategories = [
  {
    title: 'Ready To Wear',
    description: 'Stunning dresses, elegant sets, and chic separates — expertly crafted for immediate style.',
    image: '/images/category-ready-to-wear.jpg',
    link: '/ready-to-wear',
  },
  {
    title: 'Custom To Wear',
    description: 'Bespoke pieces tailored to your exact measurements — made just for you in 10-14 days.',
    image: '/images/category-custom.jpg',
    link: '/designs',
  },
  {
    title: 'Fabrics To Buy',
    description: 'Premium African textiles by the yard — Kente, Ankara, Kitenge and more direct from artisans.',
    image: '/images/category-fabrics.jpg',
    link: '/fabrics',
  },
];

// Default testimonials as fallback
const defaultTestimonials = [
  {
    id: '1',
    name: 'Amara Johnson',
    location: 'New York, USA',
    avatar: '/images/avatar-1.jpg',
    rating: 5,
    text: 'The quality exceeded my expectations. My dress fits perfectly and the fabric is gorgeous.',
  },
  {
    id: '2',
    name: 'Kwame Asante',
    location: 'London, UK',
    avatar: '/images/avatar-2.jpg',
    rating: 5,
    text: 'Amazing experience from start to finish. The custom tailoring service is a game changer!',
  },
  {
    id: '3',
    name: 'Fatima Mohammed',
    location: 'Dubai, UAE',
    avatar: '/images/avatar-3.jpg',
    rating: 5,
    text: 'Supporting African designers while getting beautiful clothes—this platform is a gem.',
  },
];

const defaultHeritageSection = {
  title: 'Rooted in Culture',
  subtitle:
    "Every pattern carries meaning. From Kente's bold geometry to Ankara's vibrant motifs, African textiles tell stories of identity, celebration, and legacy passed through generations.",
  image: '/images/heritage.jpg',
  ctaText: 'Read Our Story',
  ctaLink: '/about',
};

interface SpotlightDesigner {
  id: string;
  name: string;
  country: string;
  image: string;
  bio: string;
}

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  ctaText: string;
  ctaLink: string;
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
  badge?: string;
}

// Default hero slides as fallback
const defaultHeroSlides: HeroSlide[] = [
  {
    id: '1',
    image: '/images/hero-1.jpg',
    badge: 'NEW COLLECTION',
    title: 'Ready To Wear',
    subtitle: 'Dresses, sets, and separates — tailored fits finished by hand',
    ctaText: 'Shop Now',
    ctaLink: '/ready-to-wear',
  },
  {
    id: '2',
    image: '/images/hero-2.jpg',
    badge: 'FRESH DROPS',
    title: 'New Arrivals',
    subtitle: 'New arrivals from the most talented designers across the continent',
    ctaText: 'Explore',
    ctaLink: '/designs',
  },
  {
    id: '3',
    image: '/images/hero-3.jpg',
    badge: 'TRENDING NOW',
    title: 'Trending Styles',
    subtitle: 'The pieces everyone is talking about this season',
    ctaText: 'View Trending',
    ctaLink: '/ready-to-wear',
  },
];

// Default featured products as fallback
const defaultFeaturedDesigns: FeaturedProduct[] = [
  { id: '1', name: 'Royal Kente Gown', description: '', price: 299, image: '/images/design-1.jpg', designer: 'Amara Designs', country: 'Ghana', productType: 'DESIGN', badge: 'NEW' },
  { id: '2', name: 'Ankara Maxi Dress', description: '', price: 189, image: '/images/design-2.jpg', designer: 'Lagos Luxe', country: 'Nigeria', productType: 'DESIGN', badge: 'SALE' },
  { id: '3', name: 'Kitenge Two-Piece', description: '', price: 159, image: '/images/design-3.jpg', designer: 'Nairobi Styles', country: 'Kenya', productType: 'DESIGN', badge: 'PROMO' },
];

const defaultReadyToWear: FeaturedProduct[] = [
  { id: 'r1', name: 'Kente Midi Dress', description: '', price: 189, image: '/images/rtw-1.jpg', designer: 'Ghana • Ships in 3-5 days', country: 'Ghana', productType: 'READY_TO_WEAR', badge: 'BEST SELLER' },
  { id: 'r2', name: 'Ankara Two-Piece Set', description: '', price: 145, image: '/images/rtw-2.jpg', designer: 'Nigeria • Ships in 2-4 days', country: 'Nigeria', productType: 'READY_TO_WEAR', badge: 'SALE' },
  { id: 'r3', name: 'Batik Shift Dress', description: '', price: 120, image: '/images/rtw-3.jpg', designer: 'Senegal • Ships in 3-5 days', country: 'Senegal', productType: 'READY_TO_WEAR', badge: 'PROMO' },
  { id: 'r4', name: 'Wax Print Midi', description: '', price: 135, image: '/images/rtw-4.jpg', designer: 'Kenya • Ships in 2-4 days', country: 'Kenya', productType: 'READY_TO_WEAR', badge: 'NEW' },
];

const defaultFabrics: FeaturedProduct[] = [
  { id: 'f1', name: 'Premium Kente Cloth', description: '', price: 45, image: '/images/fabric-1.jpg', designer: 'Ghana Textiles', country: 'Ghana', productType: 'FABRIC', badge: 'SALE' },
  { id: 'f2', name: 'Luxury Ankara Print', description: '', price: 35, image: '/images/fabric-2.jpg', designer: 'Nigerian Fabrics', country: 'Nigeria', productType: 'FABRIC', badge: 'PROMO' },
  { id: 'f3', name: 'Authentic Mud Cloth', description: '', price: 55, image: '/images/fabric-3.jpg', designer: 'Mali Traditions', country: 'Mali', productType: 'FABRIC', badge: 'NEW' },
  { id: 'f4', name: 'Kitenge Wax Print', description: '', price: 30, image: '/images/fabric-4.jpg', designer: 'Kenya Fabrics', country: 'Kenya', productType: 'FABRIC', badge: 'SALE' },
];

const defaultSpotlightDesigners: SpotlightDesigner[] = [
  {
    id: 'spotlight-amara-okafor',
    name: 'Amara Okafor',
    country: 'Nigeria',
    image: '/images/designer-spotlight.jpg',
    bio: 'Modern silhouettes crafted with bold Ankara storytelling.',
  },
  {
    id: 'spotlight-esi-boateng',
    name: 'Esi Boateng',
    country: 'Ghana',
    image: '/images/design-1.jpg',
    bio: 'Elegant occasion wear inspired by Kente heritage.',
  },
  {
    id: 'spotlight-nia-kimani',
    name: 'Nia Kimani',
    country: 'Kenya',
    image: '/images/design-3.jpg',
    bio: 'Contemporary East African cuts with vibrant prints.',
  },
  {
    id: 'spotlight-aicha-ndiaye',
    name: 'Aicha Ndiaye',
    country: 'Senegal',
    image: '/images/rtw-3.jpg',
    bio: 'Refined tailoring that blends tradition with street style.',
  },
  {
    id: 'spotlight-samira-idrissi',
    name: 'Samira Idrissi',
    country: 'Morocco',
    image: '/images/hero-2.jpg',
    bio: 'Textured luxury pieces with North African influence.',
  },
];

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickRandomDesigners = (designers: SpotlightDesigner[], count: number): SpotlightDesigner[] => {
  if (designers.length <= count) return designers.slice(0, count);
  const shuffled = shuffle(designers);
  const selected: SpotlightDesigner[] = [];
  const usedCountries = new Set<string>();

  // Try to prioritize country diversity first.
  for (const designer of shuffled) {
    if (usedCountries.has(designer.country)) continue;
    selected.push(designer);
    usedCountries.add(designer.country);
    if (selected.length === count) return selected;
  }

  for (const designer of shuffled) {
    if (selected.some((entry) => entry.id === designer.id)) continue;
    selected.push(designer);
    if (selected.length === count) break;
  }

  return selected;
};

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
  const featuredDesigns = Array.isArray(featuredData?.FEATURED_DESIGNS) ? featuredData.FEATURED_DESIGNS : [];
  const featuredFabrics = Array.isArray(featuredData?.FEATURED_FABRICS) ? featuredData.FEATURED_FABRICS : [];
  const featuredRTW = Array.isArray(featuredData?.FEATURED_READY_TO_WEAR) ? featuredData.FEATURED_READY_TO_WEAR : [];
  const fashionCountryImageMap = useMemo(() => {
    const map = new Map<string, string>();
    const candidates = [...featuredDesigns, ...featuredRTW, ...featuredFabrics];
    for (const product of candidates) {
      if (!product?.country || !product?.image || map.has(product.country)) {
        continue;
      }
      map.set(product.country, resolveAssetUrl(product.image));
    }
    return map;
  }, [featuredDesigns, featuredFabrics, featuredRTW]);

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
  const { data: howItWorksData } = useQuery({
    queryKey: ['homepageHowItWorks'],
    queryFn: async () => {
      const response = await api.homepageSections.getHowItWorks();
      return response.success ? response.data : [];
    },
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['homepageShopCategories'],
    queryFn: async () => {
      const response = await api.homepageSections.getCategories();
      return response.success ? response.data : [];
    },
  });
  const { data: spotlightsData } = useQuery({
    queryKey: ['homepageDesignerSpotlights'],
    queryFn: async () => {
      const response = await api.homepageSections.getDesignerSpotlights();
      return response.success ? response.data : [];
    },
  });
  const { data: heritageData } = useQuery({
    queryKey: ['homepageHeritageSection'],
    queryFn: async () => {
      const response = await api.homepageSections.getHeritage();
      return response.success ? response.data : null;
    },
  });

  // Use dynamic data or fallback to defaults
  const countries = countriesData?.length > 0 
    ? countriesData.map((c: any) => ({ 
        name: c.name, 
        flag: c.flag || countryFlags[c.name] || '🌍', 
        image: fashionCountryImageMap.get(c.name) || resolveAssetUrl(c.image), 
        fabrics: c.fabrics 
      })) 
    : defaultCountries.map((c) => ({
        ...c,
        image: fashionCountryImageMap.get(c.name) || resolveAssetUrl(c.image),
      }));
    
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
  const howItWorksContent = howItWorksData?.length
    ? howItWorksData.map((step: any) => ({
        icon: howItWorksIconMap[step.icon] || Search,
        title: step.title,
        subtitle: step.subtitle || step.description || '',
      }))
    : howItWorksSteps;
  const shopCategoryContent = categoriesData?.length
    ? categoriesData.map((category: any) => ({
        title: category.title,
        description: category.description || category.subtitle || '',
        image: resolveAssetUrl(category.image) || '/images/placeholder.jpg',
        link: category.ctaLink || category.link || '/designs',
      }))
    : shopCategories;
  const heritageSection = heritageData
    ? {
        title: heritageData.title || defaultHeritageSection.title,
        subtitle: heritageData.subtitle || heritageData.description || defaultHeritageSection.subtitle,
        image: resolveAssetUrl(heritageData.image) || defaultHeritageSection.image,
        ctaText: heritageData.ctaText || defaultHeritageSection.ctaText,
        ctaLink: heritageData.ctaLink || defaultHeritageSection.ctaLink,
      }
    : defaultHeritageSection;

  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [customFeaturedStart, setCustomFeaturedStart] = useState(0);
  const [spotlightDesigners, setSpotlightDesigners] = useState<SpotlightDesigner[]>(
    pickRandomDesigners(defaultSpotlightDesigners, 3)
  );
  const customFeaturedPageSize = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  const customFeaturedItems = useMemo(() => {
    if (featuredDesigns.length <= customFeaturedPageSize) {
      return featuredDesigns;
    }
    const end = customFeaturedStart + customFeaturedPageSize;
    if (end <= featuredDesigns.length) {
      return featuredDesigns.slice(customFeaturedStart, end);
    }
    return [
      ...featuredDesigns.slice(customFeaturedStart),
      ...featuredDesigns.slice(0, end - featuredDesigns.length),
    ];
  }, [featuredDesigns, customFeaturedStart]);

  const spotlightDesignerPool = useMemo(() => {
    const adminSpotlights = (spotlightsData || [])
      .map((item: any) => {
        const name = item?.designer?.businessName?.trim();
        const country = item?.designer?.country?.trim();
        if (!name || !country || !item?.image) return null;
        return {
          id: item.id,
          name,
          country,
          image: resolveAssetUrl(item.image),
          bio: item.description || item.bio || item.quote || `Signature styles from ${country}.`,
        } satisfies SpotlightDesigner;
      })
      .filter((item: SpotlightDesigner | null): item is SpotlightDesigner => Boolean(item));
    const mappedDesigners = [...featuredDesigns, ...featuredRTW]
      .map((item) => {
        const cleanedName = (item.designer || '').split('•')[0].trim();
        const country = (item.country || '').trim();
        if (!cleanedName || !country || !item.image) return null;
        return {
          id: `${cleanedName}-${country}`,
          name: cleanedName,
          country,
          image: resolveAssetUrl(item.image),
          bio: `Signature styles from ${country}.`,
        } satisfies SpotlightDesigner;
      })
      .filter((item): item is SpotlightDesigner => Boolean(item));

    const designerMap = new Map<string, SpotlightDesigner>();
    for (const item of [...adminSpotlights, ...mappedDesigners, ...defaultSpotlightDesigners]) {
      if (designerMap.has(item.id)) continue;
      designerMap.set(item.id, item);
    }

    return Array.from(designerMap.values());
  }, [featuredDesigns, featuredRTW, spotlightsData]);

  useEffect(() => {
    setSpotlightDesigners(pickRandomDesigners(spotlightDesignerPool, 3));
  }, [spotlightDesignerPool]);

  useEffect(() => {
    if (spotlightDesignerPool.length === 0) return undefined;
    const timer = setInterval(() => {
      setSpotlightDesigners(pickRandomDesigners(spotlightDesignerPool, 3));
    }, 7000);
    return () => clearInterval(timer);
  }, [spotlightDesignerPool]);

  const goToPrevCustomFeatured = () => {
    if (featuredDesigns.length <= customFeaturedPageSize) return;
    setCustomFeaturedStart((prev) => (prev - 1 + featuredDesigns.length) % featuredDesigns.length);
  };

  const goToNextCustomFeatured = () => {
    if (featuredDesigns.length <= customFeaturedPageSize) return;
    setCustomFeaturedStart((prev) => (prev + 1) % featuredDesigns.length);
  };

  // Product card component
  const ProductCard = ({ product }: { product: FeaturedProduct }) => (
    <Link
      to={`/${product.productType === 'DESIGN' ? 'designs' : product.productType === 'FABRIC' ? 'fabrics' : 'ready-to-wear'}/${product.id}`}
      className="group block bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
    >
      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '3/4' }}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.badge && (
          <div className={`absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded ${
            product.badge === 'SALE' ? 'bg-red-500' : 
            product.badge === 'NEW' ? 'bg-green-500' : 
            product.badge === 'PROMO' ? 'bg-purple-500' : 
            product.badge === 'BEST SELLER' ? 'bg-amber-500' : 'bg-coral-500'
          }`}>
            {product.badge}
          </div>
        )}
        <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral-50">
          <Heart className="w-4 h-4 text-gray-600" />
        </button>
        <div className="absolute bottom-3 right-3 text-2xl">
          {countryFlags[product.country] || '🌍'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-coral-600 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{product.designer}</p>
        <p className="font-bold text-coral-600 mt-2">${product.price}{product.productType === 'FABRIC' && <span className="text-sm font-normal text-gray-500">/yard</span>}</p>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Hero Carousel */}
      <section className="relative h-[600px] md:h-[720px] lg:h-[840px] overflow-hidden">
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
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4), transparent)' }} />
            </div>
            <div className="relative h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-xl text-white">
                  <span className="inline-block px-3 py-1 bg-coral-500 text-white text-xs font-semibold tracking-wider mb-4">
                    {slide.badge}
                  </span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-4 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white text-opacity-90 mb-8">
                    {slide.subtitle}
                  </p>
                  <Link
                    to={slide.ctaLink}
                    className="inline-flex items-center gap-2 bg-white text-navy-600 px-8 py-4 rounded font-semibold transition-all hover:bg-gray-100"
                  >
                    {slide.ctaText}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-20 hover:bg-white bg-opacity-30 backdrop-blur-sm rounded text-white transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-20 hover:bg-white bg-opacity-30 backdrop-blur-sm rounded text-white transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-6' : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Countries Marquee */}
      <section className="py-6 bg-[#F5F5F0] overflow-hidden">
        <div className="flex animate-marquee">
          {[...countries, ...countries].map((country, index) => (
            <Link
              key={`${country.name}-${index}`}
              to={`/designs?country=${country.name}`}
              className="group relative flex-shrink-0 w-[14.4rem] h-32 mx-2 overflow-hidden"
            >
              <img
                src={country.image}
                alt={country.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)' }} />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-xl">{country.flag}</span>
                <h3 className="font-semibold text-sm mt-1">{country.name}</h3>
                <p className="text-xs text-white text-opacity-70">{country.fabrics}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Shop by Category</h2>
            <p className="text-gray-500">Choose what fits your moment—ready pieces, custom fits, or raw fabrics.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {shopCategoryContent.map((category, index) => (
              <Link
                key={index}
                to={category.link}
                className="group relative h-[480px] md:h-[600px] overflow-hidden"
              >
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.2), transparent)' }} />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">{category.title}</h3>
                  <p className="text-sm text-white text-opacity-80 mb-4">{category.description}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all">
                    Shop Now <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Your journey to authentic African fashion in six simple steps.
            </p>
          </div>
          <div className="flex items-start lg:items-stretch justify-between gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-2">
            {howItWorksContent.map((step, index) => (
              <div key={index} className="min-w-[160px] sm:min-w-[180px] lg:min-w-0 flex-1 text-center">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-coral-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-xs md:text-sm text-gray-600 leading-snug">{step.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Custom To Wear */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-coral-500 text-sm font-semibold mb-1">FEATURED</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Custom To Wear</h2>
              <p className="text-gray-500 mt-1">Made To Fit by an African with Love</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={goToPrevCustomFeatured}
                disabled={featuredDesigns.length <= customFeaturedPageSize}
                aria-label="Previous custom products"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={goToNextCustomFeatured}
                disabled={featuredDesigns.length <= customFeaturedPageSize}
                aria-label="Next custom products"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <Link
                to="/designs"
                className="hidden sm:inline-flex items-center gap-2 text-gray-600 hover:text-coral-600 font-medium ml-4"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {featuredLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-5">
              {customFeaturedItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Ready To Wear */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-coral-500 text-sm font-semibold mb-1">FEATURED</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Ready To Wear</h2>
              <p className="text-gray-500 mt-1">Made To Standard sizes for all</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 rounded hover:bg-gray-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="p-2 border border-gray-200 rounded hover:bg-gray-50">
                <ChevronRight className="w-5 h-5" />
              </button>
              <Link
                to="/ready-to-wear"
                className="hidden sm:inline-flex items-center gap-2 text-gray-600 hover:text-coral-600 font-medium ml-4"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {featuredLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {featuredRTW.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Fabrics */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-coral-500 text-sm font-semibold mb-1">FEATURED</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Fabrics To Buy</h2>
              <p className="text-gray-500 mt-1">Fabrics from all across the edges of Africa</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 rounded hover:bg-gray-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="p-2 border border-gray-200 rounded hover:bg-gray-50">
                <ChevronRight className="w-5 h-5" />
              </button>
              <Link
                to="/fabrics"
                className="hidden sm:inline-flex items-center gap-2 text-gray-600 hover:text-coral-600 font-medium ml-4"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {featuredLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {featuredFabrics.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Fresh Drops Banner */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="relative h-[250px] md:h-[300px] overflow-hidden">
          <img
            src="/images/fresh-drops-banner.jpg"
            alt="Fresh Drops"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-navy-600 bg-opacity-70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Fresh Drops</h2>
            <p className="text-white text-opacity-80 mb-6">New arrivals from the most talented designers across the continent.</p>
            <div className="flex gap-4">
              <Link
                to="/ready-to-wear"
                className="inline-flex items-center gap-2 bg-coral-500 hover:bg-coral-600 text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                Shop New Arrivals
              </Link>
              <Link
                to="/designs"
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
              >
                Explore Collections
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Designer Spotlight */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-coral-500 text-sm font-semibold mb-1">DESIGNER SPOTLIGHT</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Meet Designers Across Africa</h2>
              <p className="text-gray-500 mt-1">Showcasing rotating talent from different countries.</p>
            </div>
            <Link
              to="/designers"
              className="hidden sm:inline-flex items-center gap-2 text-gray-600 hover:text-coral-600 font-medium"
            >
              Meet All Designers <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {spotlightDesigners.map((designer) => (
              <Link
                key={designer.id}
                to={`/designs?country=${encodeURIComponent(designer.country)}`}
                className="group bg-white overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="h-[250px] overflow-hidden bg-gray-100">
                  <img
                    src={designer.image}
                    alt={`${designer.name} from ${designer.country}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900">{designer.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {countryFlags[designer.country] || '🌍'} {designer.country}
                  </p>
                  <p className="text-sm text-gray-600 mt-3">{designer.bio}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Heritage Story */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 bg-navy-600 overflow-hidden">
            <div className="h-[260px] md:h-full overflow-hidden">
              <img
                src={heritageSection.image}
                alt="African textile heritage"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 md:p-8 text-white flex flex-col justify-center">
              <p className="text-coral-500 text-sm font-semibold mb-2">HERITAGE STORY</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{heritageSection.title}</h2>
              <p className="text-white text-opacity-85 mb-5">{heritageSection.subtitle}</p>
              <div>
                <Link
                  to={heritageSection.ctaLink}
                  className="inline-flex items-center gap-2 bg-coral-500 hover:bg-coral-600 text-white px-6 py-3 rounded font-semibold transition-colors"
                >
                  {heritageSection.ctaText} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 bg-navy-600">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">What Our Customers Say</h2>
            <p className="text-white text-opacity-70">Join thousands of happy customers worldwide.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white bg-opacity-10 backdrop-blur-sm p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-coral-500 text-coral-500" />
                  ))}
                </div>
                <p className="text-white text-opacity-90 mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-coral-500 rounded flex items-center justify-center text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-white text-opacity-60">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-[#F5F5F0]">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Shop CTA */}
            <div className="bg-coral-500 rounded-lg p-7 md:p-10 text-center text-white">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Wear African Fashion?</h2>
              <p className="text-white text-opacity-90 mb-6">
                Join our community of fashion lovers and discover unique pieces from talented African designers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/designs"
                  className="inline-flex items-center justify-center gap-2 bg-white text-coral-600 px-6 py-3 rounded font-semibold hover:bg-gray-100 transition-colors"
                >
                  Shop Now
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded font-semibold hover:bg-white bg-opacity-10 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>

            {/* Newsletter CTA */}
            <div className="bg-coral-500 rounded-lg p-7 md:p-10 text-center text-white">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Join the Movement</h2>
              <p className="text-white text-opacity-90 mb-6">
                Subscribe to our newsletter for exclusive offers, new arrivals, and stories from the continent.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded text-gray-900"
                />
                <button className="px-6 py-3 bg-navy-600 text-white rounded font-semibold hover:bg-navy-700 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
