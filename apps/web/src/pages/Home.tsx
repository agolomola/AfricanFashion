import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star, Truck, Shield, Clock, Sparkles, MapPin, Heart, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useQuery } from '@tanstack/react-query';

// Static data that doesn't change
const features = [
  { icon: Truck, title: 'Fast Shipping', description: 'Delivered to your door in 7-14 days' },
  { icon: Shield, title: 'Quality Guaranteed', description: 'Every piece inspected by our QA team' },
  { icon: Clock, title: 'Custom Made', description: 'Tailored to your exact measurements' },
];

const countries = [
  { name: 'Ghana', flag: '🇬🇭', image: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&h=450&fit=crop', fabrics: 'Kente, Adinkra' },
  { name: 'Nigeria', flag: '🇳🇬', image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?w=600&h=450&fit=crop', fabrics: 'Ankara, Aso Oke' },
  { name: 'Kenya', flag: '🇰🇪', image: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600&h=450&fit=crop', fabrics: 'Kitenge, Kikoy' },
  { name: 'Senegal', flag: '🇸🇳', image: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=600&h=450&fit=crop', fabrics: 'Boubou, Lace' },
  { name: 'Ethiopia', flag: '🇪🇹', image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&h=450&fit=crop', fabrics: 'Tibeb, Cotton' },
  { name: 'Morocco', flag: '🇲🇦', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&h=450&fit=crop', fabrics: 'Caftan, Silk' },
];

// Testimonials (static for now)
const testimonials = [
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
  { id: 'r5', name: 'Dashiki Maxi Dress', description: '', price: 135, image: '/images/rtw-5.jpg', designer: 'Addis Couture', country: 'Ethiopia', productType: 'READY_TO_WEAR' },
  { id: 'r6', name: 'Kanga Wrap Skirt', description: '', price: 65, image: '/images/rtw-6.jpg', designer: 'Dar es Salaam Styles', country: 'Tanzania', productType: 'READY_TO_WEAR' },
  { id: 'r7', name: 'Ndebele Beaded Jacket', description: '', price: 210, image: '/images/rtw-7.jpg', designer: 'Cape Town Couture', country: 'South Africa', productType: 'READY_TO_WEAR' },
  { id: 'r8', name: 'Kaftan Embroidered Set', description: '', price: 175, image: '/images/rtw-8.jpg', designer: 'Marrakech Mode', country: 'Morocco', productType: 'READY_TO_WEAR' },
  { id: 'r9', name: 'Adinkra Print Jumpsuit', description: '', price: 155, image: '/images/rtw-9.jpg', designer: 'Kumasi Kreations', country: 'Ghana', productType: 'READY_TO_WEAR' },
  { id: 'r10', name: 'Mud Cloth Trousers', description: '', price: 99, image: '/images/rtw-10.jpg', designer: 'Bamako Boutique', country: 'Mali', productType: 'READY_TO_WEAR' },
  { id: 'r11', name: 'Habesha Kemis Dress', description: '', price: 190, image: '/images/rtw-11.jpg', designer: 'Addis Heritage', country: 'Ethiopia', productType: 'READY_TO_WEAR' },
  { id: 'r12', name: 'Chitenge Shirt Dress', description: '', price: 109, image: '/images/rtw-12.jpg', designer: 'Nairobi Originals', country: 'Kenya', productType: 'READY_TO_WEAR' },
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
      className="group block bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">...
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen">...
    <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">...
    </div>
  );
}