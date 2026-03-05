import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, resolveAssetUrl } from '../services/api';

export default function VendorStore() {
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
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-600" />
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

  return (
    <div className="bg-[#F7F6F2] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 rounded-2xl border bg-white p-6">
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
              <p className="text-sm text-gray-600">
                {vendor.city}, {vendor.country}
              </p>
              {vendor.bio ? <p className="mt-1 text-sm text-gray-500">{vendor.bio}</p> : null}
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {normalizedRole === 'seller' ? 'Fabric Products' : 'Designs'}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((item: any) => {
              const image = resolveAssetUrl(item?.images?.[0]?.url);
              const detailHref = normalizedRole === 'seller' ? `/fabrics/${item.id}` : `/designs/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={detailHref}
                  className="overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {image ? (
                    <img src={image} alt={item.name} className="h-52 w-full object-cover" />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {readyToWear.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Ready-to-Wear</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {readyToWear.map((item: any) => {
                const image = resolveAssetUrl(item?.images?.[0]?.url);
                return (
                  <Link
                    key={item.id}
                    to={`/ready-to-wear/${item.id}`}
                    className="overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {image ? (
                      <img src={image} alt={item.name} className="h-52 w-full object-cover" />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
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
