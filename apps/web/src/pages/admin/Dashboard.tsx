import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  pendingOrders: number;
  inProductionOrders: number;
  revenueChange: number;
  orderChange: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        api.admin.getDashboardStats(),
        api.admin.getRecentOrders()
      ]);
      
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (ordersRes.success) {
        setRecentOrders(ordersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Revenue', 
      value: stats?.totalRevenue || 0, 
      change: stats?.revenueChange || 0,
      icon: DollarSign,
      format: (v: number) => `$${v.toLocaleString()}`
    },
    { 
      title: 'Total Orders', 
      value: stats?.totalOrders || 0, 
      change: stats?.orderChange || 0,
      icon: ShoppingBag,
      format: (v: number) => v.toLocaleString()
    },
    { 
      title: 'Total Users', 
      value: stats?.totalUsers || 0, 
      change: 0,
      icon: Users,
      format: (v: number) => v.toLocaleString()
    },
    { 
      title: 'Products', 
      value: stats?.totalProducts || 0, 
      change: 0,
      icon: Package,
      format: (v: number) => v.toLocaleString()
    },
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button variant="outline" onClick={fetchDashboardData}>
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {card.format(card.value)}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <card.icon className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            {card.change !== 0 && (
              <div className={`flex items-center gap-1 mt-3 text-sm ${
                card.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.change > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(card.change)}% from last month</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Order Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{stats?.pendingOrders || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">In Production</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{stats?.inProductionOrders || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">QA Review</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">0</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-700">0</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Package className="w-4 h-4 mr-2" />
              Manage Products
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing Rules
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertCircle className="w-4 h-4 mr-2" />
              View Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{order.orderNumber}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{order.customerName}</td>
                  <td className="py-3 px-4 font-medium">${order.totalAmount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant={
                        order.status === 'DELIVERED' ? 'green' :
                        order.status === 'SHIPPED' ? 'blue' :
                        order.status === 'IN_PRODUCTION' ? 'purple' :
                        order.status === 'PENDING' ? 'yellow' : 'gray'
                      }
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
