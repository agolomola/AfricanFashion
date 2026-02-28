import { useState, useEffect } from 'react';
import { 
  Scissors, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag,
  Plus,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

interface DesignerStats {
  totalDesigns: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  inProductionOrders: number;
  completedOrders: number;
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
}

export default function DesignerDashboard() {
  const [stats, setStats] = useState<DesignerStats | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'designs' | 'orders'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">Designer Dashboard</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Design
        </Button>
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
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Designs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalDesigns || 0}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalOrders || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${stats?.totalRevenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Production</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.inProductionOrders || 0}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{stats?.pendingOrders || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">In Production</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{stats?.inProductionOrders || 0}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats?.completedOrders || 0}</p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Design</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                      <td className="py-3 px-4">{order.designName}</td>
                      <td className="py-3 px-4">{order.customerName}</td>
                      <td className="py-3 px-4 font-medium">${order.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4">{new Date(order.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          order.status === 'COMPLETED' ? 'green' :
                          order.status === 'IN_PRODUCTION' ? 'purple' :
                          order.status === 'PENDING' ? 'yellow' : 'gray'
                        }>
                          {order.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'designs' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Designs</h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Design
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((design) => (
              <div key={design.id} className="border rounded-xl overflow-hidden">
                <img
                  src={design.images[0]}
                  alt={design.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{design.name}</h3>
                      <p className="text-sm text-gray-500">{design.category.name}</p>
                    </div>
                    <Badge variant={design.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {design.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium text-amber-700">${design.basePrice}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="font-medium text-gray-900">⭐ {design.rating.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Orders</p>
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
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Orders</h2>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                      <Badge variant={
                        order.status === 'COMPLETED' ? 'green' :
                        order.status === 'IN_PRODUCTION' ? 'purple' :
                        order.status === 'PENDING' ? 'yellow' : 'gray'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.designName} · {order.customerName}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-amber-700">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Fabric</p>
                    <p className="text-sm font-medium">{order.fabricInfo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Order Date</p>
                    <p className="text-sm font-medium">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="text-sm font-medium">
                      {new Date(order.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Measurements</p>
                    <p className="text-sm font-medium">
                      {Object.keys(order.measurements).length} recorded
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {order.status === 'PENDING' && (
                    <Button 
                      size="sm"
                      onClick={() => handleUpdateOrderStatus(order.id, 'IN_PRODUCTION')}
                    >
                      Start Production
                    </Button>
                  )}
                  {order.status === 'IN_PRODUCTION' && (
                    <Button 
                      size="sm"
                      onClick={() => handleUpdateOrderStatus(order.id, 'READY_FOR_QA')}
                    >
                      Mark Ready for QA
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <ImageIcon className="w-4 h-4 mr-1" />
                    View Measurements
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
