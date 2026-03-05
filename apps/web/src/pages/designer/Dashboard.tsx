import { useState, useEffect } from 'react';
import { 
  Scissors, 
  DollarSign, 
  ShoppingBag,
  Plus,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  ArrowRight,
  Palette,
  Upload,
  X
} from 'lucide-react';
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
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'designs' | 'orders'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingDesign, setCreatingDesign] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFabrics, setAvailableFabrics] = useState<Array<{ id: string; name: string }>>([]);
  const [designImages, setDesignImages] = useState<File[]>([]);
  const [newDesign, setNewDesign] = useState({
    name: '',
    description: '',
    categoryId: '',
    basePrice: '',
  });
  const [measurementText, setMeasurementText] = useState('Bust\nWaist\nHip\nLength');
  const [selectedFabrics, setSelectedFabrics] = useState<Record<string, number>>({});
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      } catch (error) {
        console.error('Failed to load design form options:', error);
      }
    })();
  }, [showCreateModal]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, designsRes, ordersRes] = await Promise.all([
        api.designer.getStats(),
        api.designer.getDesigns(),
        api.designer.getOrders()
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (designsRes.success) setDesigns(designsRes.data);
      if (ordersRes.success) setOrders(ordersRes.data);
      
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

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.designer.updateOrderStatus(orderId, status);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const getOrderStatusVariant = (status: string) => {
    if (status === 'COMPLETED') return 'green';
    if (status === 'IN_PRODUCTION') return 'purple';
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
    setMeasurementText('Bust\nWaist\nHip\nLength');
    setSelectedFabrics({});
    setDesignImages([]);
    setModalError('');
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
        setModalError('Please upload at least one design image.');
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

      const measurementVariables = measurementText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          unit: 'cm',
          isRequired: true,
          instructions: '',
        }));

      const suitableFabricIds = Object.entries(selectedFabrics).map(([fabricId, yardsNeeded]) => ({
        fabricId,
        yardsNeeded: Number(yardsNeeded || 1),
      }));

      const response = await api.designer.createDesign({
        name: newDesign.name.trim(),
        description: newDesign.description.trim(),
        categoryId: newDesign.categoryId,
        basePrice: Number(newDesign.basePrice),
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
      setActiveTab('designs');
    } catch (error: any) {
      console.error('Failed to create design:', error);
      setModalError(error?.response?.data?.message || 'Failed to create design.');
    } finally {
      setCreatingDesign(false);
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
              onClick={() => setActiveTab(tab)}
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
                  onClick={() => setActiveTab('orders')}
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
                      <p className="font-medium text-amber-700">${Number(design.basePrice || 0).toFixed(2)}</p>
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
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
                  onClick={() => handleUpdateOrderStatus(item.id, 'IN_PRODUCTION')}
                >
                  Start
                </Button>
              )}
              {item.status === 'IN_PRODUCTION' && (
                <Button 
                  size="sm"
                  onClick={() => handleUpdateOrderStatus(item.id, 'COMPLETED')}
                >
                  Complete
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newDesign.basePrice}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, basePrice: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Measurement Variables (one per line)
                </label>
                <textarea
                  value={measurementText}
                  onChange={(e) => setMeasurementText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg h-28 resize-none"
                />
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
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={selectedFabrics[fabric.id]}
                          onChange={(e) =>
                            setSelectedFabrics((prev) => ({ ...prev, [fabric.id]: Number(e.target.value || 1) }))
                          }
                          className="w-20 px-2 py-1 text-sm border rounded"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
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
