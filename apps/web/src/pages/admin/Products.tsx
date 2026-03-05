import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Filter, Package, Scissors, Search, Star, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

type ProductType = 'FABRIC' | 'DESIGN' | 'READY_TO_WEAR';
type ModerationAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SUSPEND' | 'PUBLISH' | 'UNPUBLISH';

interface Product {
  id: string;
  type: ProductType;
  name: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  isAvailable: boolean;
  basePrice: number;
  finalPrice: number;
  ownerName: string;
  ownerCountry?: string;
  category: string;
  orderCount: number;
  image?: string;
  isFeatured: boolean;
  featuredSections: string[];
  createdAt: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'fabrics' | 'designs' | 'ready-to-wear'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<ModerationAction>('REQUEST_CHANGES');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchProducts();
  }, [activeTab, statusFilter, typeFilter, page, limit, search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, typeFilter]);

  const effectiveType = useMemo(() => {
    if (activeTab === 'fabrics') return 'FABRIC';
    if (activeTab === 'designs') return 'DESIGN';
    if (activeTab === 'ready-to-wear') return 'READY_TO_WEAR';
    return typeFilter || undefined;
  }, [activeTab, typeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getProducts({
        search: search || undefined,
        status: statusFilter || undefined,
        type: effectiveType,
        page,
        limit,
      });
      if (response.success) {
        setProducts(response.data.products);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const moderateProduct = async (product: Product, action: ModerationAction) => {
    try {
      setSubmitting(true);
      const requiresMessage = action === 'REQUEST_CHANGES' || action === 'REJECT' || action === 'SUSPEND';
      let message: string | undefined;
      if (requiresMessage) {
        message = window.prompt('Enter message to vendor (required):', '')?.trim() || undefined;
        if (!message) {
          setSubmitting(false);
          return;
        }
      }
      await api.admin.moderateProduct(product.type, product.id, {
        action,
        message,
        notifyVendor: true,
      });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to moderate product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      setSubmitting(true);
      await api.admin.setProductFeatured(product.type, product.id, {
        isFeatured: !product.isFeatured,
      });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;
    try {
      setSubmitting(true);
      const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
      const byType = selectedProducts.reduce<Record<ProductType, string[]>>(
        (acc, product) => {
          acc[product.type].push(product.id);
          return acc;
        },
        { FABRIC: [], DESIGN: [], READY_TO_WEAR: [] }
      );
      const message =
        bulkAction === 'REQUEST_CHANGES' || bulkAction === 'REJECT' || bulkAction === 'SUSPEND'
          ? window.prompt('Enter message to affected vendors:', '')?.trim() || undefined
          : undefined;
      if ((bulkAction === 'REQUEST_CHANGES' || bulkAction === 'REJECT' || bulkAction === 'SUSPEND') && !message) {
        setSubmitting(false);
        return;
      }
      await Promise.all(
        (Object.entries(byType) as [ProductType, string[]][])
          .filter(([, ids]) => ids.length > 0)
          .map(([productType, productIds]) =>
            api.admin.moderateProductsBulk({
              productType,
              productIds,
              action: bulkAction,
              message,
              notifyVendor: true,
            })
          )
      );
      await fetchProducts();
    } catch (error) {
      console.error('Failed to run bulk moderation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (product: Product) => {
    if (product.status === 'APPROVED' && !product.isAvailable) return 'UNPUBLISHED';
    return product.status;
  };

  const statusVariant = (product: Product) => {
    if (product.status === 'APPROVED' && !product.isAvailable) return 'gray';
    if (product.status === 'APPROVED') return 'green';
    if (product.status === 'PENDING_REVIEW') return 'yellow';
    if (product.status === 'REJECTED') return 'red';
    if (product.status === 'ARCHIVED') return 'gray';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <div className="text-sm text-gray-500">Total products: {pagination.total}</div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(['all', 'fabrics', 'designs', 'ready-to-wear'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'ready-to-wear' ? 'Ready to Wear' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Types</option>
          <option value="FABRIC">Fabric</option>
          <option value="DESIGN">Design</option>
          <option value="READY_TO_WEAR">Ready to Wear</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <span className="text-sm font-medium text-amber-900">{selectedIds.length} selected</span>
        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value as ModerationAction)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="REQUEST_CHANGES">Request changes</option>
          <option value="APPROVE">Approve + Publish</option>
          <option value="REJECT">Reject</option>
          <option value="SUSPEND">Suspend</option>
          <option value="UNPUBLISH">Unpublish</option>
          <option value="PUBLISH">Publish</option>
        </select>
        <Button onClick={handleBulkAction} disabled={selectedIds.length === 0 || submitting}>
          Apply to selected
        </Button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? products.map((product) => product.id) : [])
                    }
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Seller/Designer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Featured</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Orders</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, product.id]
                            : prev.filter((selectedId) => selectedId !== product.id)
                        )
                      }
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        product.type === 'FABRIC' ? 'bg-blue-100' :
                        product.type === 'DESIGN' ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                        {product.type === 'FABRIC' ? (
                          <Package className="w-5 h-5 text-blue-600" />
                        ) : product.type === 'DESIGN' ? (
                          <Scissors className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Package className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{product.type}</Badge>
                  </td>
                  <td className="py-3 px-4 font-medium">${Number(product.finalPrice || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={statusVariant(product)}>
                      {statusLabel(product)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <div>{product.ownerName}</div>
                    <div className="text-xs text-gray-400">{product.ownerCountry || '-'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleFeatured(product)}
                      className={`p-2 rounded-lg ${product.isFeatured ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={product.isFeatured ? 'Remove from featured' : 'Add to featured'}
                      disabled={submitting}
                    >
                      <Star className={`w-4 h-4 ${product.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{product.orderCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateProduct(product, 'APPROVE')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Approve and publish"
                        disabled={submitting}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, 'REQUEST_CHANGES')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Request corrections"
                        disabled={submitting}
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, 'REJECT')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Reject product"
                        disabled={submitting}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, product.isAvailable ? 'UNPUBLISH' : 'PUBLISH')}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50"
                        disabled={submitting}
                      >
                        {product.isAvailable ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {Math.max(1, pagination.pages)} • {pagination.total} products
          </p>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border rounded"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(pagination.pages || 1, prev + 1))}
              disabled={page >= (pagination.pages || 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
