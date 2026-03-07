import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Loader2, Star } from 'lucide-react';
import { api, resolveAssetUrl } from '../services/api';
import { fashionFallbackImage } from '../utils/fashionPlaceholder';
import { useCurrency } from '../components/ui/CurrencyProvider';

const countryFlags: Record<string, string> = {
  Ghana: '🇬🇭',
  Nigeria: '🇳🇬',
  Kenya: '🇰🇪',
  Senegal: '🇸🇳',
  Ethiopia: '🇪🇹',
  Morocco: '🇲🇦',
  Mali: '🇲🇱',
  'South Africa': '🇿🇦',
  Tanzania: '🇹🇿',
};

const fallbackImage = (seed: string, width = 1200, height = 1600) =>
  fashionFallbackImage(seed, { width, height });

export default function VendorStore() {
  const { formatFromUsd } = useCurrency();
  const { role = '', userId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<any>(null);

  const normalizedRole = useMemo(() => (role === 'seller' ? 'seller' : 'designer'), [role]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.products.getVendorStore(normalizedRole as 'seller' | 'designer', userId);
        if (res.success) {
          setPayload(res.data);
        } else {
          setError('Vendor store could not be loaded.');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Vendor store could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      void load();
    }
  }, [normalizedRole, userId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-coral-500" />
      </div>
    );
  }

  if (error || !payload?.vendor) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Storefront unavailable</h1>
        <p className="mt-2 text-gray-600">{error || 'The vendor storefront is unavailable right now.'}</p>
      </div>
    );
  }

  const vendor = payload.vendor;
  const logo = resolveAssetUrl(vendor.logo);
  const products = normalizedRole === 'seller' ? payload.products || [] : payload.products?.designs || [];
  const readyToWear = normalizedRole === 'designer' ? payload.products?.readyToWear || [] : [];
  const totalProducts = products.length + readyToWear.length;
  const heroImage =
    resolveAssetUrl(products?.[0]?.images?.[0]?.url) ||
    resolveAssetUrl(readyToWear?.[0]?.images?.[0]?.url) ||
    fallbackImage(`${vendor.businessName || 'vendor'}-cover`, 1920, 1080);
  const vendorFlag = countryFlags[vendor.country] || '🌍';
  const titlePrefix = normalizedRole === 'seller' ? 'Fabric Seller' : 'Fashion Designer';

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img src={heroImage} alt={`${vendor.businessName} storefront`} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.55), transparent)' }}
        />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl">
              <p className="text-coral-300 text-sm font-semibold mb-2">{titlePrefix}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white">{vendor.businessName}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/85">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {vendor.city}, {vendor.country}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-coral-300" />
                  Vendor storefront
                </span>
                <span>{totalProducts} products</span>
              </div>
              {vendor.bio ? <p className="mt-3 text-white/80 max-w-2xl">{vendor.bio}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt={vendor.businessName} className="h-16 w-16 rounded-full border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-gray-100 text-xl font-semibold text-gray-600">
                {String(vendor.businessName || 'V').charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.businessName}</h1>
              <p className="text-sm text-gray-600">{vendor.city}, {vendor.country}</p>
              <p className="text-sm text-gray-500 mt-1">
                {vendorFlag} {normalizedRole === 'seller' ? 'Verified Fabric Seller Store' : 'Verified Designer Store'}
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {normalizedRole === 'seller' ? 'Fabrics To Buy' : 'Custom Designs'}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((item: any) => {
              const image = resolveAssetUrl(item?.images?.[0]?.url);
              const detailHref = normalizedRole === 'seller' ? `/fabrics/${item.id}` : `/designs/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={detailHref}
                  className="group bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                    {image ? (
                      <img src={image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>
                    )}
                    <div className="absolute bottom-3 right-3 text-2xl">{vendorFlag}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">{item.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                    <p className="mt-2 text-sm font-semibold text-coral-600">
                      {formatFromUsd(Number(item.finalPrice || item.basePrice || 0))}
                      {normalizedRole === 'seller' ? <span className="text-xs text-gray-500 font-normal">/yard</span> : null}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          {products.length === 0 && (
            <div className="bg-white border border-gray-200 p-6 text-sm text-gray-600">No products listed yet.</div>
          )}
        </section>

        {readyToWear.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">Ready-to-Wear</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {readyToWear.map((item: any) => {
                const image = resolveAssetUrl(item?.images?.[0]?.url);
                return (
                  <Link
                    key={item.id}
                    to={`/ready-to-wear/${item.id}`}
                    className="group bg-white shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1"
                  >
                    <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                      {image ? (
                        <img src={image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>
                      )}
                      <div className="absolute bottom-3 right-3 text-2xl">{vendorFlag}</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-coral-500 transition-colors">{item.name}</h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      <p className="mt-2 text-sm font-semibold text-coral-600">
                        {formatFromUsd(Number(item.basePrice || 0))}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
