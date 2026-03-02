import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  DollarSign, 
  Package,
  Clock,
  CheckCircle,
  Truck,
  Star,
  Heart,
  MapPin,
  Ruler,
  ArrowRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import DataTable from '../../components/dashboard/DataTable';
import { LineChart } from '../../components/dashboard/SimpleChart';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  deliveredOrders: number;
  wishlistCount: number;
  savedMeasurements: number;
  monthlySpending: { label: string; value: number }[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  design: {
    name: string;
    images: string[];
  };
  fabric: {
    name: string;
    images: string[];
  };
  designer: {
    businessName: string;
  };
  designStatus: string;
  fabricStatus: string;
  shippingStatus: string;
  trackingNumber?: string;
}

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  designer: string;
}

interface Activity {
  id: string;
  type: 'order' | 'shipping' | 'review' | 'system';
  title: string;
  description: string;
  timestamp: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string; bgColor: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', label: 'Pending', bgColor: 'bg-yellow-50' },
  CONFIRMED: { icon: CheckCircle, color: 'text-blue-600', label: 'Confirmed', bgColor: 'bg-blue-50' },
  IN_PRODUCTION: { icon: Package, color: 'text-purple-600', label: 'In Production', bgColor: 'bg-purple-50' },
  QA_REVIEW: { icon: AlertCircle, color: 'text-orange-600', label: 'QA Review', bgColor: 'bg-orange-50' },
  READY_FOR_SHIPPING: { icon: Package, color: 'text-cyan-600', label: 'Ready to Ship', bgColor: 'bg-cyan-50' },
  SHIPPED: { icon: Truck, color: 'text-indigo-600', label: 'Shipped', bgColor: 'bg-indigo-50' },
  DELIVERED: { icon: CheckCircle, color: 'text-green-600', label: 'Delivered', bgColor: 'bg-green-50' },
  CANCELLED: { icon: AlertCircle, color: 'text-red-600', label: 'Cancelled', bgColor: 'bg-red-50' },
};

export default function CustomerDashboard() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        api.customer.getProfile(),
        api.customer.getOrders()
      ]);
      
      if (statsRes.success) {
        setStats(statsRes.data.stats);
        setWishlist(statsRes.data.wishlist || []);
      }
      if (ordersRes.success) {
        setOrders(ordersRes.data);
      }
      
      // Mock activities
      setActivities([
        {
          id: '1',
          type: 'order',
          title: 'Order placed',
          description: 'Order #C-2024-156 for Royal Kente Gown',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: '2',
          type: 'shipping',
          title: 'Order shipped',
          description: 'Order #C-2024-142 is on its way',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: '3',
          type: 'review',
          title: 'Review requested',
          description: 'Please review your recent purchase',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: '4',
          type: 'system',
          title: 'Welcome offer',
          description: 'Get 10% off your next order with code WELCOME10',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderProgress = (status: string): number => {
    const progressMap: Record<string, number> = {
      'PENDING': 10,
      'CONFIRMED': 20,
      'IN_PRODUCTION': 40,
      'QA_REVIEW': 60,
      'READY_FOR_SHIPPING': 75,
      'SHIPPED': 80,
      'DELIVERED': 100,
    };
    return progressMap[status] || 0;
  };

  const pendingOrders = orders.filter(o => ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'QA_REVIEW'].includes(o.status));
  const recentOrders = orders.slice(0, 3);

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
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your orders and manage your account</p>
        </div>
        <Button asChild>
          <Link to="/designs">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Shop Now
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          icon={ShoppingBag}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Total Spent"
          value={`$${(stats?.totalSpent || 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Wishlist"
          value={stats?.wishlistCount || 0}
          icon={Heart}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          subtitle="Saved items"
        />
        <StatCard
          title="Measurements"
          value={stats?.savedMeasurements || 0}
          icon={Ruler}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          subtitle="Saved profiles"
        />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(['overview', 'orders', 'wishlist'] as const).map((tab) => (
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
          {/* Pending Orders Alert */}
          {pendingOrders.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">
                    You have {pendingOrders.length} active order{pendingOrders.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-blue-700">
                    Track your orders to stay updated
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('orders')}
                >
                  Track Orders
                </Button>
              </div>
            </div>
          )}

          {/* Spending Chart & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Spending */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending</h3>
              <LineChart 
                data={stats?.monthlySpending || [
                  { label: 'Jan', value: 450 },
                  { label: 'Feb', value: 680 },
                  { label: 'Mar', value: 520 },
                  { label: 'Apr', value: 890 },
                  { label: 'May', value: 1200 },
                  { label: 'Jun', value: 750 },
                ]}
                height={200}
              />
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const status = statusConfig[order.status];
                  const StatusIcon = status?.icon || Clock;
                  
                  return (
                    <div key={order.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={order.design.images[0]}
                        alt={order.design.name}
                        className="w-16 h-20 object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <Badge variant={status?.color.replace('text-', '') as any} size="sm">
                            {status?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{order.design.name}</p>
                        <p className="text-sm font-medium text-amber-700">${order.totalAmount.toFixed(2)}</p>
                      </div>
                      <StatusIcon className={`w-5 h-5 ${status?.color}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <ActivityFeed activities={activities} title="Recent Activity" />
        </>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const StatusIcon = status?.icon || Clock;
            const progress = getOrderProgress(order.status);
            
            return (
              <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                      <Badge variant={status?.color.replace('text-', '') as any}>
                        {status?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Ordered on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-amber-700">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="flex gap-4 mb-4">
                  <img
                    src={order.design.images[0]}
                    alt={order.design.name}
                    className="w-24 h-32 object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{order.design.name}</h4>
                    <p className="text-sm text-gray-500">by {order.designer.businessName}</p>
                    <p className="text-sm text-gray-500 mt-1">Fabric: {order.fabric.name}</p>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>Order Placed</span>
                        <span>In Production</span>
                        <span>QA Review</span>
                        <span>Shipped</span>
                        <span>Delivered</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        order.designStatus === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-gray-600">Design: {order.designStatus}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        order.fabricStatus === 'DELIVERED' ? 'bg-green-500' : 
                        order.fabricStatus === 'SHIPPED' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-gray-600">Fabric: {order.fabricStatus}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'DELIVERED' && (
                      <Button variant="outline" size="sm">
                        <Star className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    )}
                    {order.trackingNumber && (
                      <Button variant="outline" size="sm">
                        <Truck className="w-4 h-4 mr-2" />
                        Track
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      Details
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">My Wishlist</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/designs">
                Continue Shopping
              </Link>
            </Button>
          </div>
          
          {wishlist.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 mb-4">Save items you love for later</p>
              <Button asChild>
                <Link to="/designs">
                  Browse Designs
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map((item) => (
                <div key={item.id} className="border overflow-hidden group">
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-56 object-cover group-hover:scale-105 transition-transform"
                    />
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">by {item.designer}</p>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-lg font-bold text-amber-700">${item.price}</p>
                      <Button size="sm">
                        <ShoppingBag className="w-4 h-4 mr-1" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
