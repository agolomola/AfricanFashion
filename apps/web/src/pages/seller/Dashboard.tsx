import { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag,
  Plus,
  Edit,
  Eye,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

interface SellerStats {
  totalFabrics: number;
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
}

interface Fabric {
  id: string;
  name: string;
  pricePerMeter: number;
  stockMeters: number;
  images: string[];
  orderCount: number;
  status: string;
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
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [orders, setOrders] = useState<FabricOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'fabrics' | 'orders'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, fabricsRes, ordersRes] = await Promise.all([
        api.seller.getStats(),
        api.seller.getFabrics(),
        api.seller.getOrders()
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (fabricsRes.success) setFabrics(fabricsRes.data);
      if (ordersRes.success) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (fabricId: string, newStock: number) => {
    try {
      await api.seller.updateFabricStock(fabricId, newStock);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.seller.updateOrderStatus(orderId, status);
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
        <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Fabric
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(['overview', 'fabrics', 'orders'] as const).map((tab) => (
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
                  <p className="text-sm text-gray-500">Total Fabrics</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalFabrics || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalSales || 0}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-green-600" />
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
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.pendingOrders || 0}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {stats?.lowStockItems && stats.lowStockItems > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Low Stock Alert</p>
                <p className="text-sm text-red-700">
                  {stats.lowStockItems} fabric{stats.lowStockItems > 1 ? 's are' : ' is'} running low on stock.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                onClick={() => setActiveTab('fabrics')}
              >
                View Fabrics
              </Button>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Fabric Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fabric</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Meters</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                      <td className="py-3 px-4">{order.fabricName}</td>
                      <td className="py-3 px-4">{order.meters}m</td>
                      <td className="py-3 px-4 font-medium">${order.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          order.status === 'DELIVERED' ? 'green' :
                          order.status === 'SHIPPED' ? 'blue' :
                          order.status === 'CONFIRMED' ? 'yellow' : 'gray'
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

      {activeTab === 'fabrics' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Fabrics</h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Fabric
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fabrics.map((fabric) => (
              <div key={fabric.id} className="border rounded-xl overflow-hidden">
                <img
                  src={fabric.images[0]}
                  alt={fabric.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{fabric.name}</h3>
                      <p className="text-sm text-gray-500">${fabric.pricePerMeter}/meter</p>
                    </div>
                    <Badge variant={fabric.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {fabric.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Stock</p>
                      <p className={`font-medium ${fabric.stockMeters < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {fabric.stockMeters}m
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Orders</p>
                      <p className="font-medium text-gray-900">{fabric.orderCount}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Fabric Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fabric</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Meters</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Designer Country</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                    <td className="py-3 px-4">{order.fabricName}</td>
                    <td className="py-3 px-4">{order.meters}m</td>
                    <td className="py-3 px-4 font-medium">${order.totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-4">{order.designerCountry}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        order.status === 'DELIVERED' ? 'green' :
                        order.status === 'SHIPPED' ? 'blue' :
                        order.status === 'CONFIRMED' ? 'yellow' : 'gray'
                      }>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {order.status === 'CONFIRMED' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                        >
                          Mark Shipped
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
