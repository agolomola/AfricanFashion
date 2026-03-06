import { useState, useEffect, useMemo, type ChangeEvent, type DragEvent } from 'react';
import { 
  Package, 
  DollarSign, 
  ShoppingBag,
  Plus,
  Edit,
  Eye,
  AlertCircle,
  Truck,
  Clock,
  MapPin,
  ArrowRight,
  Upload,
  X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import DataTable from '../../components/dashboard/DataTable';
import { BarChart, LineChart } from '../../components/dashboard/SimpleChart';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuthStore } from '../../store/authStore';
import { getVendorStorePathForRole } from '../../auth/rbac';

interface SellerStats {
  totalFabrics: number;
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
  monthlySales: { label: string; value: number }[];
  topFabrics: { label: string; value: number }[];
  salesChange: number;
  revenueChange: number;
}

interface Fabric {
  id: string;
  name: string;
  description?: string;
  pricePerMeter: number;
  currencyCode?: string;
  localSellerPrice?: number;
  sellerPriceUsd?: number;
  stockMeters: number;
  images: string[];
  orderCount: number;
  status: string;
  materialType: { name: string };
  minOrderMeters: number;
}

interface FabricOrder {
  id: string;
  orderNumber: string;
  fabricName: string;
  meters: number;
  totalAmount: number;
  status: string;
  designerCountry: string;
  createdAt: string;
  customerName: string;
}

interface Activity {
  id: string;
  type: 'order' | 'inventory' | 'system';
  title: string;
  description: string;
  timestamp: string;
}

const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}:${file.type}`;

const mergeUniqueFiles = (existing: File[], incoming: File[], maxCount: number) => {
  const map = new Map<string, File>();
  for (const file of existing) {
    map.set(getFileKey(file), file);
  }
  for (const file of incoming) {
    map.set(getFileKey(file), file);
  }
  return Array.from(map.values()).slice(0, maxCount);
};

export default function SellerDashboard() {
  const toast = useToast();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [orders, setOrders] = useState<FabricOrder[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'fabrics' | 'orders'>('overview');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingFabric, setCreatingFabric] = useState(false);
  const [materials, setMaterials] = useState<Array<{ id: string; name: string }>>([]);
  const [newFabricImages, setNewFabricImages] = useState<File[]>([]);
  const [draggedFabricImageIndex, setDraggedFabricImageIndex] = useState<number | null>(null);
  const [newFabric, setNewFabric] = useState({
    name: '',
    description: '',
    materialTypeId: '',
    sellerPrice: '',
    currencyCode: 'USD',
    minYards: '1',
    stockYards: '0',
  });
  const [vendorCurrencyOptions, setVendorCurrencyOptions] = useState<string[]>(['USD']);
  const [usdPerUnitByCurrency, setUsdPerUnitByCurrency] = useState<Record<string, number>>({ USD: 1 });
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [modalError, setModalError] = useState('');
  const [vendorProfileStatus, setVendorProfileStatus] = useState<'INCOMPLETE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('INCOMPLETE');
  const [vendorProfileReviewNotes, setVendorProfileReviewNotes] = useState('');
  const [copiedStorefront, setCopiedStorefront] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const vendorStorePath = getVendorStorePathForRole(user?.role, user?.id);
  const vendorStoreUrl =
    vendorStorePath && typeof window !== 'undefined'
      ? `${window.location.origin}${vendorStorePath}`
      : vendorStorePath || '';
  const canManageProducts = vendorProfileStatus === 'APPROVED';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/seller/fabrics')) {
      setActiveTab('fabrics');
      return;
    }
    if (location.pathname.startsWith('/seller/orders')) {
      setActiveTab('orders');
      return;
    }
    setActiveTab('overview');
  }, [location.pathname]);

  useEffect(() => {
    if (
      (vendorProfileStatus === 'INCOMPLETE' || vendorProfileStatus === 'REJECTED') &&
      location.pathname === '/seller'
    ) {
      navigate('/seller/profile-setup', { replace: true });
    }
  }, [vendorProfileStatus, location.pathname, navigate]);

  useEffect(() => {
    if (!showCreateModal) return;
    (async () => {
      try {
        const [materialsRes, currencyRes] = await Promise.all([
          api.products.getMaterials(),
          api.currency.getMyOptions(),
        ]);
        if (materialsRes.success) {
          setMaterials(materialsRes.data || []);
        }
        if (currencyRes.success) {
          setVendorCurrencyOptions(currencyRes.data.allowedCurrencies || ['USD']);
          setUsdPerUnitByCurrency(currencyRes.data.usdPerUnitByCurrency || { USD: 1 });
          setDefaultCurrency(currencyRes.data.defaultCurrency || 'USD');
          setNewFabric((prev) => ({
            ...prev,
            currencyCode: prev.currencyCode || currencyRes.data.defaultCurrency || 'USD',
          }));
        }
      } catch (error) {
        console.error('Failed to load material types:', error);
        toast.error('Failed to load listing options.');
      }
    })();
  }, [showCreateModal, toast]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, fabricsRes, ordersRes] = await Promise.allSettled([
        api.seller.getStats(),
        api.seller.getFabrics(),
        api.seller.getOrders(),
      ]);
      const profileRes = await api.seller.getProfileSetup().catch(() => null);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data);
      }
      if (fabricsRes.status === 'fulfilled' && fabricsRes.value.success) {
        setFabrics(fabricsRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.success) {
        setOrders(ordersRes.value.data);
      }

      if (
        statsRes.status === 'rejected' ||
        fabricsRes.status === 'rejected' ||
        ordersRes.status === 'rejected'
      ) {
        toast.error('Some dashboard data failed to load. Please refresh.');
      }
      if (profileRes?.success) {
        setVendorProfileStatus(profileRes.data?.status || 'INCOMPLETE');
        setVendorProfileReviewNotes(profileRes.data?.reviewNotes || '');
      }
      
      // Mock activities
      setActivities([
        {
          id: '1',
          type: 'order',
          title: 'New fabric order',
          description: 'Order #F-2024-156 for 15m of Premium Kente',
          timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        },
        {
          id: '2',
          type: 'inventory',
          title: 'Low stock alert',
          description: 'Ghana Adinkra Cloth is running low (8m left)',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: '3',
          type: 'order',
          title: 'Order shipped',
          description: 'Order #F-2024-142 shipped to Nigeria',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: '4',
          type: 'system',
          title: 'Payout processed',
          description: '$890.00 deposited to your account',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load seller dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (fabricId: string, stock: number) => {
    try {
      await api.seller.updateFabricStock(fabricId, stock);
      setShowStockModal(false);
      setSelectedFabric(null);
      fetchDashboardData();
      toast.success('Stock updated successfully.');
    } catch (error: any) {
      console.error('Failed to update stock:', error);
      toast.error(error?.response?.data?.message || 'Failed to update stock.');
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: string,
    options?: { trackingNumber?: string; notes?: string }
  ) => {
    try {
      await api.seller.updateOrderStatus(orderId, status, options);
      fetchDashboardData();
      toast.success('Order status updated.');
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      toast.error(error?.response?.data?.message || 'Failed to update order status.');
    }
  };

  const openStockModal = (fabric: Fabric) => {
    setSelectedFabric(fabric);
    setNewStock(fabric.stockMeters);
    setShowStockModal(true);
  };

  const safeFabrics = Array.isArray(fabrics) ? fabrics : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const lowStockFabrics = safeFabrics.filter((f) => Number(f?.stockMeters || 0) < 20);
  const pendingOrders = safeOrders.filter((o) => o?.status === 'CONFIRMED');

  const getOrderVariant = (status: string) => {
    if (status === 'DELIVERED') return 'green';
    if (status === 'SHIPPED_TO_DESIGNER' || status === 'SHIPPED') return 'blue';
    if (status === 'CONFIRMED' || status === 'PENDING') return 'yellow';
    return 'gray';
  };

  const resetCreateFabricForm = () => {
    setNewFabric({
      name: '',
      description: '',
      materialTypeId: '',
      sellerPrice: '',
      currencyCode: defaultCurrency || 'USD',
      minYards: '1',
      stockYards: '0',
    });
    setNewFabricImages([]);
    setModalError('');
  };

  const navigateToTab = (tab: 'overview' | 'fabrics' | 'orders') => {
    const path = tab === 'overview' ? '/seller' : `/seller/${tab}`;
    navigate(path);
  };

  const copyStorefrontUrl = async () => {
    if (!vendorStoreUrl) return;
    try {
      await navigator.clipboard.writeText(vendorStoreUrl);
      setCopiedStorefront(true);
      window.setTimeout(() => setCopiedStorefront(false), 1800);
    } catch {
      window.prompt('Copy storefront URL:', vendorStoreUrl);
    }
  };

  const handleCreateFabric = async () => {
    try {
      if (!canManageProducts) {
        toast.error('Complete and submit your full vendor profile, then wait for admin approval before uploading.');
        navigate('/seller/profile-setup');
        return;
      }
      setModalError('');
      const trimmedName = newFabric.name.trim();
      const trimmedDescription = newFabric.description.trim();
      const sellerPrice = Number(newFabric.sellerPrice);
      const minYards = Number(newFabric.minYards);
      const stockYards = Number(newFabric.stockYards);

      if (!trimmedName || !trimmedDescription || !newFabric.materialTypeId || !newFabric.sellerPrice) {
        setModalError('Please fill all required fields.');
        return;
      }
      if (trimmedName.length < 2) {
        setModalError('Fabric name must be at least 2 characters.');
        return;
      }
      if (trimmedDescription.length < 10) {
        setModalError('Description must be at least 10 characters.');
        return;
      }
      if (!Number.isFinite(sellerPrice) || sellerPrice <= 0) {
        setModalError('Seller base price must be greater than 0.');
        return;
      }
      if (!Number.isFinite(minYards) || minYards < 1) {
        setModalError('Minimum order quantity must be at least 1 yard.');
        return;
      }
      if (!Number.isFinite(stockYards) || stockYards < 0) {
        setModalError('Available stock cannot be negative.');
        return;
      }
      if (newFabricImages.length < 3 || newFabricImages.length > 4) {
        setModalError('Fabric products require 3-4 images.');
        return;
      }
      setCreatingFabric(true);

      const uploadedImages: Array<{ url: string; alt?: string }> = [];
      for (const file of newFabricImages) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          setModalError(`Unsupported image type (${file.type || 'unknown'}).`);
          return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setModalError(`Image is too large. Max allowed size is ${MAX_UPLOAD_MB}MB.`);
          return;
        }
        const formData = new FormData();
        formData.append('image', file);
        const uploadResponse = await api.upload.image(formData);
        if (uploadResponse.success) {
          uploadedImages.push({ url: uploadResponse.data.url, alt: newFabric.name });
        } else {
          setModalError(uploadResponse.message || 'One or more images failed to upload.');
          return;
        }
      }

      if (uploadedImages.length === 0) {
        setModalError('Image upload failed. Please try again.');
        return;
      }

      const createResponse = await api.seller.createFabric({
        name: trimmedName,
        description: trimmedDescription,
        materialTypeId: newFabric.materialTypeId,
        sellerPrice,
        currencyCode: newFabric.currencyCode || defaultCurrency || 'USD',
        minYards,
        stockYards,
        images: uploadedImages,
      });

      if (!createResponse.success) {
        setModalError('Failed to create fabric.');
        return;
      }

      setShowCreateModal(false);
      resetCreateFabricForm();
      fetchDashboardData();
      navigateToTab('fabrics');
      toast.success('Fabric submitted successfully.');
    } catch (error: any) {
      console.error('Failed to create fabric:', error);
      setModalError(error?.response?.data?.message || 'Failed to create fabric.');
      toast.error(error?.response?.data?.message || 'Failed to create fabric.');
    } finally {
      setCreatingFabric(false);
    }
  };

  const handleEditFabric = async (fabric: Fabric) => {
    try {
      if (!canManageProducts) {
        toast.error('Your vendor profile must be approved before editing products.');
        navigate('/seller/profile-setup');
        return;
      }
      const name = window.prompt('Fabric name:', fabric.name)?.trim();
      if (!name) return;
      const description = window.prompt('Description (min 10 chars):', fabric.description || '')?.trim();
      if (!description || description.length < 10) {
        toast.error('Description must be at least 10 characters.');
        return;
      }
      const sellerPriceRaw = window.prompt(
        `Seller price in ${fabric.currencyCode || defaultCurrency || 'USD'}:`,
        String(fabric.localSellerPrice ?? fabric.pricePerMeter)
      )?.trim();
      if (!sellerPriceRaw) return;
      const sellerPrice = Number(sellerPriceRaw);
      if (!Number.isFinite(sellerPrice) || sellerPrice <= 0) {
        toast.error('Seller price must be a positive number.');
        return;
      }

      await api.seller.updateFabric(fabric.id, {
        name,
        description,
        sellerPrice,
        currencyCode: fabric.currencyCode || defaultCurrency || 'USD',
      });
      toast.success('Fabric updated and sent for re-approval.');
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Failed to update fabric:', error);
      toast.error(error?.response?.data?.message || 'Failed to update fabric.');
    }
  };

  const removeFabricImageAt = (index: number) => {
    setNewFabricImages((previous) => previous.filter((_, idx) => idx !== index));
  };

  const reorderFabricImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setNewFabricImages((previous) => {
      if (fromIndex < 0 || fromIndex >= previous.length || toIndex < 0 || toIndex >= previous.length) {
        return previous;
      }
      const copy = [...previous];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const handleFabricImageSelection = (files: File[]) => {
    if (files.length === 0) return;
    setNewFabricImages((previous) => {
      const merged = mergeUniqueFiles(previous, files, 4);
      const attempted = previous.length + files.length;
      if (attempted > 4 && merged.length === 4) {
        setModalError('Maximum 4 images allowed. Extra images were ignored.');
      }
      return merged;
    });
  };

  const handleFabricImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFabricImageSelection(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const handleFabricImageDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleFabricImageSelection(Array.from(event.dataTransfer.files || []));
  };

  const fabricImagePreviews = useMemo(
    () =>
      newFabricImages.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        key: getFileKey(file),
      })),
    [newFabricImages]
  );

  useEffect(
    () => () => {
      fabricImagePreviews.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [fabricImagePreviews]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your fabrics and track sales</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} disabled={!canManageProducts}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Fabric
        </Button>
      </div>

      {!canManageProducts && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Product upload is locked until your full profile is approved by admin.
          </p>
          {vendorProfileReviewNotes ? (
            <p className="mt-1 text-xs text-amber-700">Admin note: {vendorProfileReviewNotes}</p>
          ) : null}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => navigate('/seller/profile-setup')}>
              Complete / Review Profile
            </Button>
          </div>
        </div>
      )}

      {vendorStorePath && (
        <div className="rounded-xl border border-coral-100 bg-coral-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-coral-700">Your storefront URL</p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link to={vendorStorePath} className="text-sm text-coral-700 hover:text-coral-800 underline break-all">
              {vendorStoreUrl}
            </Link>
            <Button variant="outline" size="sm" onClick={copyStorefrontUrl}>
              {copiedStorefront ? 'Copied' : 'Copy URL'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Fabrics"
          value={stats?.totalFabrics || 0}
          icon={Package}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          subtitle="Active fabrics"
        />
        <StatCard
          title="Total Sales"
          value={stats?.totalSales || 0}
          change={stats?.salesChange}
          icon={ShoppingBag}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Revenue"
          value={`$${Number(stats?.totalRevenue || 0).toFixed(2)}`}
          change={stats?.revenueChange}
          icon={DollarSign}
          iconColor="text-coral-500"
          iconBgColor="bg-coral-100"
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders || 0}
          icon={Clock}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          subtitle="Awaiting shipment"
        />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(['overview', 'fabrics', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => navigateToTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? 'text-coral-500' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'orders' && pendingOrders.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingOrders.length}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Low Stock Alert */}
          {lowStockFabrics.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">
                    Low Stock Alert
                  </p>
                  <p className="text-sm text-red-700">
                    {lowStockFabrics.length} fabric{lowStockFabrics.length > 1 ? 's are' : ' is'} running low on stock
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigateToTab('fabrics')}
                >
                  Update Stock
                </Button>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales</h3>
              <LineChart 
                data={stats?.monthlySales || [
                  { label: 'Jan', value: 45 },
                  { label: 'Feb', value: 52 },
                  { label: 'Mar', value: 68 },
                  { label: 'Apr', value: 61 },
                  { label: 'May', value: 85 },
                  { label: 'Jun', value: 92 },
                ]}
                height={200}
              />
            </div>

            {/* Top Fabrics */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Fabrics</h3>
              <BarChart 
                data={stats?.topFabrics || [
                  { label: 'Kente', value: 156, color: 'bg-coral-500' },
                  { label: 'Ankara', value: 142, color: 'bg-blue-500' },
                  { label: 'Aso Oke', value: 98, color: 'bg-purple-500' },
                  { label: 'Adinkra', value: 76, color: 'bg-green-500' },
                ]}
                height={200}
              />
            </div>
          </div>

          {/* Recent Orders & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <Button variant="ghost" size="sm" onClick={() => navigateToTab('orders')}>
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                {safeOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.fabricName} · {order.meters}m</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-coral-600">${Number(order.totalAmount || 0).toFixed(2)}</p>
                      
                      <Badge variant={getOrderVariant(order.status)} size="sm">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <ActivityFeed activities={activities} title="Recent Activity" />
          </div>
        </>
      )}

      {activeTab === 'fabrics' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">My Fabrics</h2>
            <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={!canManageProducts}>
              <Plus className="w-4 h-4 mr-2" />
              Add Fabric
            </Button>
          </div>
          <DataTable
            columns={[
              { 
                key: 'name', 
                header: 'Fabric',
                render: (item) => (
                  <div className="flex items-center gap-3">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                        No img
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.materialType?.name}</p>
                    </div>
                  </div>
                )
              },
              { 
                key: 'pricePerMeter', 
                header: 'Price',
                render: (item) => (
                  <div>
                    <p className="font-medium">{item.currencyCode || 'USD'} {Number(item.localSellerPrice ?? item.pricePerMeter).toFixed(2)}/yd</p>
                    <p className="text-xs text-gray-500">USD {Number(item.sellerPriceUsd ?? item.pricePerMeter).toFixed(2)}</p>
                  </div>
                )
              },
              { 
                key: 'stockMeters', 
                header: 'Stock',
                render: (item) => (
                  <span className={item.stockMeters < 20 ? 'text-red-600 font-medium' : ''}>
                    {item.stockMeters}m
                  </span>
                )
              },
              { key: 'orderCount', header: 'Orders' },
              { 
                key: 'status', 
                header: 'Status',
                render: (item) => (
                  <Badge variant={item.status === 'ACTIVE' ? 'green' : item.status === 'PENDING_REVIEW' ? 'yellow' : 'gray'}>
                    {item.status}
                  </Badge>
                )
              },
            ]}
            data={safeFabrics}
            keyExtractor={(item) => item.id}
            searchable
            searchKeys={['name', 'materialType.name']}
            actions={(item) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openStockModal(item)} disabled={!canManageProducts}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEditFabric(item)} disabled={!canManageProducts}>
                  Edit Product
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/fabrics/${item.id}`)}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </div>
      )}

      {activeTab === 'orders' && (
        <DataTable
          title="All Fabric Orders"
          columns={[
            { key: 'orderNumber', header: 'Order ID' },
            { key: 'fabricName', header: 'Fabric' },
            { key: 'meters', header: 'Meters', render: (item) => `${item.meters}m` },
            { 
              key: 'totalAmount', 
              header: 'Amount',
              render: (item) => `$${Number(item.totalAmount || 0).toFixed(2)}`
            },
            { 
              key: 'designerCountry', 
              header: 'Destination',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {item.designerCountry}
                </div>
              )
            },
            { 
              key: 'status', 
              header: 'Status',
              render: (item) => (
                <Badge variant={getOrderVariant(item.status)}>
                  {item.status}
                </Badge>
              )
            },
          ]}
          data={safeOrders}
          keyExtractor={(item) => item.id}
          searchable
          searchKeys={['orderNumber', 'fabricName', 'designerCountry']}
          actions={(item) => (
            <div className="flex gap-2">
              {item.status === 'CONFIRMED' && (
                <Button 
                  size="sm"
                  onClick={() => {
                    const trackingNumber = window.prompt('Enter tracking number (optional):', '')?.trim() || undefined;
                    handleUpdateOrderStatus(item.id, 'SHIPPED_TO_DESIGNER', {
                      trackingNumber,
                      notes: trackingNumber ? `Shipped with tracking: ${trackingNumber}` : undefined,
                    });
                  }}
                >
                  <Truck className="w-4 h-4 mr-1" />
                  Ship
                </Button>
              )}
              {item.status === 'SHIPPED_TO_DESIGNER' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateOrderStatus(item.id, 'DELIVERED', { notes: 'Marked delivered by seller' })}
                >
                  Mark Delivered
                </Button>
              )}
            </div>
          )}
        />
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedFabric && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Stock: {selectedFabric.name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stock: {selectedFabric.stockMeters}m
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                New Stock Quantity (yards)
              </label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border rounded-lg"
                min="0"
                placeholder="Enter updated stock in yards"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowStockModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => handleUpdateStock(selectedFabric.id, newStock)}
              >
                Update Stock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Fabric Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload New Fabric</h3>
                <p className="text-sm text-gray-500 mt-1">Fill in product details, then upload 3-4 images before submitting.</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateFabricForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {modalError}
              </div>
            )}

            <div className="mb-4 p-3 rounded-lg bg-coral-50 border border-coral-100">
              <p className="text-xs text-coral-700 font-medium">
                Image requirements: 3-4 images • max {MAX_UPLOAD_MB}MB each • JPG/PNG/WEBP/AVIF/HEIC/HEIF
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fabric Name *</label>
                <input
                  type="text"
                  value={newFabric.name}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newFabric.description}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type *</label>
                <select
                  value={newFabric.materialTypeId}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, materialTypeId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select material</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seller Base Price per yard ({newFabric.currencyCode || 'USD'}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newFabric.sellerPrice}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, sellerPrice: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. 24.99"
                />
                <p className="text-xs text-gray-500 mt-1">Set in your listing currency. Admin markups/rules apply after USD conversion.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Currency *</label>
                <select
                  value={newFabric.currencyCode}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, currencyCode: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {vendorCurrencyOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Estimated USD: $
                  {(
                    Number(newFabric.sellerPrice || 0) *
                    Number(usdPerUnitByCurrency[newFabric.currencyCode || 'USD'] || 1)
                  ).toFixed(2)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Quantity (yards)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newFabric.minYards}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, minYards: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. 1"
                />
                <p className="text-xs text-gray-500 mt-1">Smallest quantity a customer can order.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Stock (yards)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newFabric.stockYards}
                  onChange={(e) => setNewFabric((prev) => ({ ...prev, stockYards: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. 100"
                />
                <p className="text-xs text-gray-500 mt-1">Total inventory currently available for sale.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fabric Images *</label>
                <label
                  className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-600 cursor-pointer hover:border-coral-400 hover:bg-coral-50/50 transition-colors block"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleFabricImageDrop}
                >
                  Drag and drop fabric images here, or click to browse
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif"
                    multiple
                    onChange={handleFabricImageInputChange}
                    className="hidden"
                  />
                </label>
                {newFabricImages.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {newFabricImages.length} image(s) selected • Max {MAX_UPLOAD_MB}MB each
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Image rule: minimum 3 and maximum 4. Drag file rows to reorder display order.</p>
                {newFabricImages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {fabricImagePreviews.map(({ file, url, key }, index) => (
                      <div
                        key={`${key}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 bg-white"
                        draggable
                        onDragStart={() => setDraggedFabricImageIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedFabricImageIndex === null) return;
                          reorderFabricImages(draggedFabricImageIndex, index);
                          setDraggedFabricImageIndex(null);
                        }}
                        onDragEnd={() => setDraggedFabricImageIndex(null)}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <img
                            src={url}
                            alt={`Fabric upload preview ${index + 1}`}
                            className="h-12 w-12 rounded-md object-cover border border-gray-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {index + 1}. {file.name}
                            </p>
                            <p className="text-[11px] text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs text-gray-600 hover:text-gray-800 disabled:opacity-40"
                            onClick={() => reorderFabricImages(index, index - 1)}
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="text-xs text-gray-600 hover:text-gray-800 disabled:opacity-40"
                            onClick={() => reorderFabricImages(index, index + 1)}
                            disabled={index === newFabricImages.length - 1}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:text-red-700"
                            onClick={() => removeFabricImageAt(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateFabricForm();
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateFabric} disabled={creatingFabric}>
                <Upload className="w-4 h-4 mr-2" />
                {creatingFabric ? 'Uploading...' : 'Upload Fabric'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
