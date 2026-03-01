import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus,
  Edit,
  Eye,
  MoreVertical,
  Package,
  Scissors,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface Product {
  id: string;
  name: string;
  type: 'FABRIC' | 'DESIGN' | 'READY_TO_WEAR';
  price: number;
  status: string;
  sellerName?: string;
  designerName?: string;
  category: string;
  orderCount: number;
  createdAt: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'fabrics' | 'designs' | 'ready-to-wear'>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // In a real app, fetch from API
      // const response = await api.admin.getProducts({ ... });
      // Mock data for now
      setProducts([
        {
          id: '1',
          name: 'Premium Ankara Print',
          type: 'FABRIC',
          price: 25.00,
          status: 'ACTIVE',
          sellerName: 'African Fabrics Co.',
          category: 'Ankara',
          orderCount: 45,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Traditional Kente Cloth',
          type: 'FABRIC',
          price: 45.00,
          status: 'ACTIVE',
          sellerName: 'Kente Masters',
          category: 'Kente',
          orderCount: 32,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Elegant Dashiki Design',
          type: 'DESIGN',
          price: 120.00,
          status: 'ACTIVE',
          designerName: 'Fashion House Lagos',
          category: 'Traditional',
          orderCount: 28,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // await api.admin.updateProductStatus(id, 'ACTIVE');
      fetchProducts();
    } catch (error) {
      console.error('Failed to approve product:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      // await api.admin.updateProductStatus(id, 'REJECTED');
      fetchProducts();
    } catch (error) {
      console.error('Failed to reject product:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || product.type === typeFilter;
    const matchesStatus = !statusFilter || product.status === statusFilter;
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'fabrics' && product.type === 'FABRIC') ||
                      (activeTab === 'designs' && product.type === 'DESIGN') ||
                      (activeTab === 'ready-to-wear' && product.type === 'READY_TO_WEAR');
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Button variant="outline" onClick={fetchProducts}>
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Seller/Designer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Orders</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
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
                  <td className="py-3 px-4 font-medium">${product.price.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant={
                        product.status === 'ACTIVE' ? 'green' :
                        product.status === 'PENDING' ? 'yellow' :
                        product.status === 'REJECTED' ? 'red' : 'gray'
                      }
                    >
                      {product.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {product.sellerName || product.designerName || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{product.orderCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      {product.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleApprove(product.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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
