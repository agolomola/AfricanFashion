import { useState, useEffect } from 'react';
import { 
  Scissors, 
  DollarSign, 
  ShoppingBag,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Palette,
  Upload,
  X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import DataTable from '../../components/dashboard/DataTable';
import { BarChart, LineChart } from '../../components/dashboard/SimpleChart';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

interface DesignerStats {
  totalDesigns: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  monthlyRevenue: { label: string; value: number }[];
  topDesigns: { label: string; value: number }[];
  rating: number;
  revenueChange: number;
  orderChange: number;
}

interface Design {
  id: string;
  name: string;
  basePrice: number;
  currencyCode?: string;
  localBasePrice?: number;
  basePriceUsd?: number;
  images: string[];
  category: { name: string };
  rating: number;
  orderCount: number;
  status: string;
  createdAt: string;
}

interface DesignOrder {
  id: string;
  orderNumber: string;
  designName: string;
  customerName: string;
  measurements: Record<string, number>;
  fabricInfo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Activity {
  id: string;
  type: 'order' | 'review' | 'system';
  title: string;
  description: string;
  timestamp: string;
}

export default function DesignerDashboard() {
  const [stats, setStats] = useState<DesignerStats | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [readyToWearProducts, setReadyToWearProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'designs' | 'orders'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingDesign, setCreatingDesign] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFabrics, setAvailableFabrics] = useState<Array<{ id: string; name: string }>>([]);
  const [measurementTemplates, setMeasurementTemplates] = useState<
    Array<{ name: string; unit?: string; isRequired?: boolean; instructions?: string }>
  >([]);
  const [vendorCurrencyOptions, setVendorCurrencyOptions] = useState<string[]>(['USD']);
  const [usdPerUnitByCurrency, setUsdPerUnitByCurrency] = useState<Record<string, number>>({ USD: 1 });
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [listingCurrency, setListingCurrency] = useState('USD');
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<string, Record<string, number>>>({});
  const [savingStockProductId, setSavingStockProductId] = useState<string | null>(null);
  const [designImages, setDesignImages] = useState<File[]>([]);
  const [newDesign, setNewDesign] = useState({
    name: '',
    description: '',
    categoryId: '',
    basePrice: '',
  });
  const [selectedFabrics, setSelectedFabrics] = useState<Record<string, number>>({});
  const [modalError, setModalError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (location.pathname === '/designer/designs') {
      setActiveTab('designs');
      return;
    }
    if (location.pathname === '/designer/orders') {
      setActiveTab('orders');
      return;
    }
    setActiveTab('overview');
  }, [location.pathname]);

  useEffect(() => {
    if (!showCreateModal) return;
    (async () => {
      try {
        const [categoriesRes, fabricsRes] = await Promise.all([
          api.products.getCategories(),
          api.products.getFabrics({ limit: 100 }),
        ]);
        if (categoriesRes.success) {
          setCategories(categoriesRes.data || []);
        }
        if (fabricsRes.success) {
          const rows = (fabricsRes.data?.fabrics || []).map((f: any) => ({
            id: f.id,
            name: f.name,
          }));
          setAvailableFabrics(rows);
        }
        const currencyRes = await api.currency.getMyOptions();
        if (currencyRes.success) {
          setVendorCurrencyOptions(currencyRes.data.allowedCurrencies || ['USD']);
          setUsdPerUnitByCurrency(currencyRes.data.usdPerUnitByCurrency || { USD: 1 });
          setDefaultCurrency(currencyRes.data.defaultCurrency || 'USD');
          setListingCurrency(currencyRes.data.defaultCurrency || 'USD');
        }
        const measurementRes = await api.designer.getMeasurementTemplates();
        if (measurementRes.success) {
          const templates = measurementRes.data || [];
          setMeasurementTemplates(templates);
          setSelectedMeasurements(
            templates.filter((row: any) => row?.isRequired).map((row: any) => String(row?.name || ''))
          );
        }
      } catch (error) {
        console.error('Failed to load design form options:', error);
      }
    })();
  }, [showCreateModal]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, designsRes, ordersRes, readyToWearRes] = await Promise.all([
        api.designer.getStats(),
        api.designer.getDesigns(),
        api.designer.getOrders(),
        api.designer.getReadyToWear(),
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (designsRes.success) setDesigns(designsRes.data);
      if (ordersRes.success) setOrders(ordersRes.data);
      if (readyToWearRes.success) {
        const rows = readyToWearRes.data || [];
        setReadyToWearProducts(rows);
        const drafts: Record<string, Record<string, number>> = {};
        rows.forEach((product: any) => {
          drafts[product.id] = {};
          (product.sizeVariations || []).forEach((size: any) => {
            drafts[product.id][size.id] = Number(size.stock || 0);
          });
        });
        setStockDrafts(drafts);
      }
      
      // Mock activities
      setActivities([
        {
          id: '1',
          type: 'order',
          title: 'New order received',
          description: 'Order #D-2024-089 for Royal Kente Gown',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: '2',
          type: 'review',
          title: '5-star review received',
          description: 'Customer loved the Ankara Maxi Dress',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: '3',
          type: 'order',
          title: 'Order completed',
          description: 'Order #D-2024-076 delivered successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: '4',
          type: 'system',
          title: 'Payout processed',
          description: '$1,250.00 deposited to your account',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      await api.designer.updateOrderStatus(orderId, status, notes);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleUpdateReadyToWearStock = async (productId: string) => {
    try {
      setSavingStockProductId(productId);
      const draft = stockDrafts[productId] || {};
      const payload = Object.entries(draft).map(([id, stock]) => ({
        id,
        stock: Number(stock || 0),
      }));
      await api.designer.updateReadyToWearStock(productId, payload);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to update ready-to-wear stock:', error);
    } finally {
      setSavingStockProductId(null);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const getOrderStatusVariant = (status: string) => {
    if (status === 'COMPLETED') return 'green';
    if (status === 'IN_PRODUCTION') return 'purple';
    if (status === 'READY_FOR_QA') return 'blue';
    if (status === 'PENDING' || status === 'CONFIRMED' || status === 'FABRIC_RECEIVED') return 'yellow';
    if (status === 'QA_REJECTED') return 'red';
    return 'gray';
  };

  const resetCreateDesignForm = () => {
    setNewDesign({
      name: '',
      description: '',
      categoryId: '',
      basePrice: '',
    });
    setListingCurrency(defaultCurrency || 'USD');
    setSelectedMeasurements(measurementTemplates.filter((item) => item.isRequired).map((item) => item.name));
    setSelectedFabrics({});
    setDesignImages([]);
    setModalError('');
  };

  const navigateToTab = (tab: 'overview' | 'designs' | 'orders') => {
    const path = tab === 'overview' ? '/designer' : `/designer/${tab}`;
    navigate(path);
  };

  const toggleFabricSelection = (fabricId: string) => {
    setSelectedFabrics((prev) => {
      if (prev[fabricId]) {
        const next = { ...prev };
        delete next[fabricId];
        return next;
      }
      return { ...prev, [fabricId]: 3 };
    });
  };

  const handleCreateDesign = async () => {
    try {
      setModalError('');
      if (!newDesign.name || !newDesign.description || !newDesign.categoryId || !newDesign.basePrice) {
        setModalError('Please fill all required fields.');
        return;
      }
      if (designImages.length === 0) {
        setModalError('Please upload between 4 and 6 design images.');
        return;
      }
      if (designImages.length < 4 || designImages.length > 6) {
        setModalError('Designs require 4-6 images.');
        return;
      }
      setCreatingDesign(true);

      const uploadedImages: Array<{ url: string; alt?: string }> = [];
      for (const file of designImages) {
        const formData = new FormData();
        formData.append('image', file);
        const uploadResponse = await api.upload.image(formData);
        if (uploadResponse.success) {
          uploadedImages.push({ url: uploadResponse.data.url, alt: newDesign.name });
        }
      }
      if (uploadedImages.length === 0) {
        setModalError('Image upload failed. Please try again.');
        return;
      }

      const measurementVariables = measurementTemplates
        .filter((template) => selectedMeasurements.includes(template.name))
        .map((template) => ({
          name: template.name,
          unit: template.unit || 'cm',
          isRequired: template.isRequired ?? true,
          instructions: template.instructions || '',
        }));
      if (measurementVariables.length === 0) {
        setModalError('Please select at least one measurement variable.');
        return;
      }

      const suitableFabricIds = Object.entries(selectedFabrics).map(([fabricId, yardsNeeded]) => ({
        fabricId,
        yardsNeeded: Number(yardsNeeded || 1),
      }));

      const response = await api.designer.createDesign({
        name: newDesign.name.trim(),
        description: newDesign.description.trim(),
        categoryId: newDesign.categoryId,
        basePrice: Number(newDesign.basePrice),
        currencyCode: listingCurrency || defaultCurrency || 'USD',
        suitableFabricIds,
        measurementVariables,
        images: uploadedImages,
      });

      if (!response.success) {
        setModalError('Failed to create design.');
        return;
      }

      setShowCreateModal(false);
      resetCreateDesignForm();
      fetchDashboardData();
      navigateToTab('designs');
    } catch (error: any) {
      console.error('Failed to create design:', error);
      setModalError(error?.response?.data?.message || 'Failed to create design.');
    } finally {
      setCreatingDesign(false);
    }
  };

  const handleEditDesign = async (design: Design) => {
    try {
      const name = window.prompt('Design name:', design.name)?.trim();
      if (!name) return;
      const description = window.prompt('Description (min 10 chars):', '')?.trim();
      if (!description || description.length < 10) {
        setModalError('Description must be at least 10 characters.');
        return;
      }
      await api.designer.updateDesign(design.id, {
        name,
        description,
        currencyCode: design.currencyCode || defaultCurrency || 'USD',
      });
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to edit design:', error);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designer Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your designs and track orders</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Design
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Designs"
          value={stats?.totalDesigns || 0}
          icon={Palette}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          subtitle="Active designs"
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          change={stats?.orderChange}
          icon={ShoppingBag}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Revenue"
          value={`$${(stats?.totalRevenue || 0).toFixed(2)}`}
          change={stats?.revenueChange}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Rating"
          value={`${(stats?.rating || 0).toFixed(1)} ⭐`}
          icon={Star}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          subtitle="Average rating"
        />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(['overview', 'designs', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => navigateToTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'orders' && pendingOrders.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingOrders.length}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Order Status & Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">Pending</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-700">{stats?.pendingOrders || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Scissors className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">In Production</span>
                  </div>
                  <span className="text-xl font-bold text-purple-700">{stats?.inProductionOrders || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Completed</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">{stats?.completedOrders || 0}</span>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
              <LineChart 
                data={stats?.monthlyRevenue || [
                  { label: 'Jan', value: 1200 },
                  { label: 'Feb', value: 1800 },
                  { label: 'Mar', value: 2400 },
                  { label: 'Apr', value: 2100 },
                  { label: 'May', value: 3200 },
                  { label: 'Jun', value: 3800 },
                ]}
                height={200}
              />
            </div>
          </div>

          {/* Top Designs & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Designs */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Designs</h3>
              <BarChart 
                data={stats?.topDesigns || [
                  { label: 'Kente Gown', value: 45, color: 'bg-amber-500' },
                  { label: 'Ankara Dress', value: 38, color: 'bg-blue-500' },
                  { label: 'Dashiki', value: 32, color: 'bg-purple-500' },
                  { label: 'Boubou', value: 28, color: 'bg-green-500' },
                ]}
                height={180}
              />
            </div>

            {/* Activity Feed */}
            <ActivityFeed activities={activities} title="Recent Activity" />
          </div>

          {/* Pending Orders Alert */}
          {pendingOrders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">
                    You have {pendingOrders.length} pending order{pendingOrders.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-amber-700">
                    Start production to keep your customers happy
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigateToTab('orders')}
                >
                  View Orders
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'designs' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">My Designs</h2>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Design
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((design) => (
              <div key={design.id} className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {design.images?.[0] ? (
                    <img
                      src={design.images[0]}
                      alt={design.name}
                      className="w-full h-56 object-cover"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                  <Badge 
                    variant={design.status === 'ACTIVE' ? 'green' : design.status === 'PENDING_REVIEW' ? 'yellow' : 'gray'}
                    className="absolute top-3 right-3"
                  >
                    {design.status}
                  </Badge>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{design.name}</h3>
                      <p className="text-sm text-gray-500">{design.category.name}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="font-medium text-amber-700">
                          {design.currencyCode || 'USD'} {Number(design.localBasePrice ?? (design.basePrice || 0)).toFixed(2)}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          USD {Number(design.basePriceUsd ?? (design.basePrice || 0)).toFixed(2)}
                        </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rating</p>
                      <p className="font-medium text-gray-900">⭐ {Number(design.rating || 0).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="font-medium text-gray-900">{design.orderCount}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditDesign(design)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/designs/${design.id}`)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready-to-Wear Stock Management</h3>
            <div className="space-y-4">
              {readyToWearProducts.map((product) => (
                <div key={product.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category?.name || 'Category not set'}</p>
                    </div>
                    <Badge variant={product.status === 'APPROVED' ? 'green' : 'yellow'}>{product.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    {(product.sizeVariations || []).map((size: any) => (
                      <div key={size.id} className="rounded border p-2">
                        <p className="text-xs text-gray-500 mb-1">Size {size.size}</p>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Stock Units</label>
                        <input
                          type="number"
                          min={0}
                          value={stockDrafts[product.id]?.[size.id] ?? size.stock}
                          onChange={(e) =>
                            setStockDrafts((prev) => ({
                              ...prev,
                              [product.id]: {
                                ...(prev[product.id] || {}),
                                [size.id]: Number(e.target.value || 0),
                              },
                            }))
                          }
                          className="w-full rounded border px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateReadyToWearStock(product.id)}
                      disabled={savingStockProductId === product.id}
                    >
                      {savingStockProductId === product.id ? 'Saving stock...' : 'Save stock'}
                    </Button>
                  </div>
                </div>
              ))}
              {readyToWearProducts.length === 0 && (
                <p className="text-sm text-gray-500">No ready-to-wear products yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <DataTable
          title="All Orders"
          columns={[
            { key: 'orderNumber', header: 'Order ID' },
            { key: 'designName', header: 'Design' },
            { key: 'customerName', header: 'Customer' },
            { 
              key: 'totalAmount', 
              header: 'Amount',
              render: (item) => `$${item.totalAmount.toFixed(2)}`
            },
            { 
              key: 'dueDate', 
              header: 'Due Date',
              render: (item) => new Date(item.dueDate).toLocaleDateString()
            },
            { 
              key: 'status', 
              header: 'Status',
              render: (item) => (
                <Badge variant={getOrderStatusVariant(item.status)}>
                  {item.status}
                </Badge>
              )
            },
          ]}
          data={orders}
          keyExtractor={(item) => item.id}
          searchable
          searchKeys={['orderNumber', 'designName', 'customerName']}
          actions={(item) => (
            <div className="flex gap-2">
              {item.status === 'PENDING' && (
                <Button 
                  size="sm"
                  onClick={() => handleUpdateOrderStatus(item.id, 'CONFIRMED', 'Designer confirmed order')}
                >
                  Confirm
                </Button>
              )}
              {item.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateOrderStatus(item.id, 'FABRIC_RECEIVED', 'Fabric received by designer')}
                >
                  Fabric Received
                </Button>
              )}
              {item.status === 'FABRIC_RECEIVED' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateOrderStatus(item.id, 'IN_PRODUCTION', 'Production started')}
                >
                  Start
                </Button>
              )}
              {item.status === 'IN_PRODUCTION' && (
                <Button 
                  size="sm"
                  onClick={() => handleUpdateOrderStatus(item.id, 'READY_FOR_QA', 'Production complete and ready for QA')}
                >
                  Send to QA
                </Button>
              )}
            </div>
          )}
        />
      )}

      {/* Create Design Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload New Design</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateDesignForm();
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Design Name *</label>
                <input
                  type="text"
                  value={newDesign.name}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newDesign.description}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={newDesign.categoryId}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price ({listingCurrency || 'USD'}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newDesign.basePrice}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, basePrice: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. 120.00"
                />
                <p className="text-xs text-gray-500 mt-1">Designer base price before admin markups/rules.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Currency *</label>
                <select
                  value={listingCurrency}
                  onChange={(e) => setListingCurrency(e.target.value)}
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
                    Number(newDesign.basePrice || 0) *
                    Number(usdPerUnitByCurrency[listingCurrency || 'USD'] || 1)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Measurement Variables *
                </label>
                <div className="max-h-40 overflow-auto border rounded-lg p-2 space-y-2">
                  {measurementTemplates.map((item) => {
                    const checked = selectedMeasurements.includes(item.name);
                    return (
                      <label key={item.name} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedMeasurements((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, item.name]))
                                : prev.filter((name) => name !== item.name)
                            );
                          }}
                        />
                        <span>
                          <span className="font-medium text-gray-800">{item.name}</span>{' '}
                          <span className="text-gray-500">({item.unit || 'cm'})</span>
                          {item.isRequired ? <span className="ml-1 text-xs text-amber-700">required</span> : null}
                        </span>
                      </label>
                    );
                  })}
                  {measurementTemplates.length === 0 && (
                    <p className="text-xs text-gray-500">No templates configured yet by admin.</p>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suitable Fabrics (optional)
                </label>
                <div className="max-h-40 overflow-auto border rounded-lg p-2 space-y-2">
                  {availableFabrics.map((fabric) => (
                    <div key={fabric.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedFabrics[fabric.id])}
                        onChange={() => toggleFabricSelection(fabric.id)}
                      />
                      <span className="flex-1 text-sm">{fabric.name}</span>
                      {selectedFabrics[fabric.id] ? (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-gray-500 whitespace-nowrap">Yards needed</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={selectedFabrics[fabric.id]}
                            onChange={(e) =>
                              setSelectedFabrics((prev) => ({ ...prev, [fabric.id]: Number(e.target.value || 1) }))
                            }
                            className="w-20 px-2 py-1 text-sm border rounded"
                            placeholder="3"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter required fabric quantity (yards) for each selected fabric option.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Design Images *</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setDesignImages(Array.from(e.target.files || []))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {designImages.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{designImages.length} image(s) selected</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Design image rule: minimum 4, maximum 6.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateDesignForm();
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateDesign} disabled={creatingDesign}>
                <Upload className="w-4 h-4 mr-2" />
                {creatingDesign ? 'Uploading...' : 'Upload Design'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
