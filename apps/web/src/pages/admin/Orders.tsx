import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Eye, Filter, MessageSquare, Package, Search, Truck, UserCheck, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface TimelineEntry {
  id: string;
  status: string;
  notes?: string;
  updatedByRole: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  designName: string;
  designerName: string;
  fabricSellerName: string;
  totalAmount: number;
  status: string;
  designStatus: string;
  fabricStatus: string;
  qaStatus: string;
  trackingNumber?: string;
  timeline: TimelineEntry[];
  createdAt: string;
}

const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'FABRIC_PENDING',
  'FABRIC_CONFIRMED',
  'FABRIC_SHIPPED',
  'FABRIC_RECEIVED',
  'IN_PRODUCTION',
  'PRODUCTION_COMPLETE',
  'QA_PENDING',
  'QA_INSPECTING',
  'QA_APPROVED',
  'QA_REJECTED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusToSet, setStatusToSet] = useState<string>('COMPLETED');
  const [statusNotes, setStatusNotes] = useState('');
  const [messageRecipient, setMessageRecipient] = useState<'CUSTOMER' | 'VENDORS' | 'QA' | 'INTERNAL'>('INTERNAL');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { id: routeOrderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    void fetchOrders();
  }, [statusFilter, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!routeOrderId || !orders.length) return;
    const match = orders.find((order) => order.id === routeOrderId);
    if (match) {
      setSelectedOrder(match);
      setShowDetailModal(true);
    }
  }, [routeOrderId, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getOrders({
        status: statusFilter || undefined,
        page,
        limit,
      });
      if (response.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
        if (selectedOrder) {
          const refreshed = response.data.orders.find((order: Order) => order.id === selectedOrder.id);
          if (refreshed) {
            setSelectedOrder(refreshed);
            setTrackingNumber(refreshed.trackingNumber || '');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch = 
      String(order.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      String(order.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, search, statusFilter]);

  const handleUpdateTracking = async () => {
    if (!selectedOrder || !trackingNumber.trim()) return;
    try {
      setSubmitting(true);
      await api.admin.updateOrderTracking(selectedOrder.id, trackingNumber.trim(), 'Tracking updated by admin');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to update tracking:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceStatus = async () => {
    if (!selectedOrder || !statusToSet) return;
    try {
      setSubmitting(true);
      await api.admin.forceOrderStatus(selectedOrder.id, statusToSet, statusNotes || undefined);
      setStatusNotes('');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to force order status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedOrder || !messageText.trim()) return;
    try {
      setSubmitting(true);
      await api.admin.sendOrderMessage(selectedOrder.id, {
        recipient: messageRecipient,
        message: messageText.trim(),
      });
      setMessageText('');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to send order message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    if (routeOrderId) {
      navigate('/admin/orders', { replace: true });
    }
  };

  const getStatusVariant = (status: string) => {
    if (status === 'DELIVERED' || status === 'COMPLETED') return 'green';
    if (status === 'SHIPPED') return 'blue';
    if (status === 'IN_PRODUCTION' || status === 'PRODUCTION_COMPLETE') return 'purple';
    if (status === 'PENDING_PAYMENT' || status === 'PAYMENT_CONFIRMED' || status === 'FABRIC_PENDING' || status === 'QA_PENDING' || status === 'QA_INSPECTING') return 'yellow';
    if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'QA_REJECTED') return 'red';
    return 'gray';
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
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <Button variant="outline" onClick={fetchOrders}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="PAYMENT_CONFIRMED">Payment Confirmed</option>
          <option value="FABRIC_PENDING">Fabric Pending</option>
          <option value="FABRIC_CONFIRMED">Fabric Confirmed</option>
          <option value="FABRIC_SHIPPED">Fabric Shipped</option>
          <option value="FABRIC_RECEIVED">Fabric Received</option>
          <option value="IN_PRODUCTION">In Production</option>
          <option value="PRODUCTION_COMPLETE">Production Complete</option>
          <option value="QA_PENDING">QA Pending</option>
          <option value="QA_INSPECTING">QA Inspecting</option>
          <option value="QA_APPROVED">QA Approved</option>
          <option value="QA_REJECTED">QA Rejected</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <Button variant="outline" onClick={fetchOrders}>
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch(searchInput.trim());
                  }}
                >
                  Apply Search
                </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Design</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fabric</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">QA</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                  <td className="py-3 px-4">{order.customerName}</td>
                  <td className="py-3 px-4 font-medium">${Number(order.totalAmount || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs">
                      {order.designStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs">
                      {order.fabricStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs">
                      {order.qaStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                            setTrackingNumber(order.trackingNumber || '');
                            setStatusToSet(order.status || 'COMPLETED');
                        navigate(`/admin/orders/${order.id}`);
                      }}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        No orders found.
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {Math.max(1, pagination.pages)} • {pagination.total} orders
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

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Order Details</h3>
              <button 
                onClick={closeDetailModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="text-lg font-bold">{selectedOrder.orderNumber}</p>
                </div>
                <Badge 
                  variant={getStatusVariant(selectedOrder.status)}
                >
                  {selectedOrder.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-amber-700">${Number(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Designer</p>
                  <p className="font-medium">{selectedOrder.designerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fabric Seller</p>
                  <p className="font-medium">{selectedOrder.fabricSellerName}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Order Progress</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-purple-600" />
                      <span>Design Production</span>
                    </div>
                    <Badge variant="outline">{selectedOrder.designStatus}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span>Fabric Delivery</span>
                    </div>
                    <Badge variant="outline">{selectedOrder.fabricStatus}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-orange-600" />
                      <span>QA Review</span>
                    </div>
                    <Badge variant="outline">{selectedOrder.qaStatus}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700">Admin Controls</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <Button className="md:col-span-2" onClick={handleUpdateTracking} disabled={submitting || !trackingNumber.trim()}>
                    <Truck className="w-4 h-4 mr-2" />
                    Update Tracking
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={statusToSet}
                    onChange={(e) => setStatusToSet(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Status note (optional)"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <Button variant="outline" onClick={handleForceStatus} disabled={submitting}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Force Status
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700">Order Communication</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={messageRecipient}
                    onChange={(e) => setMessageRecipient(e.target.value as 'CUSTOMER' | 'VENDORS' | 'QA' | 'INTERNAL')}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="INTERNAL">Internal note</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDORS">Vendor(s)</option>
                    <option value="QA">QA</option>
                  </select>
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Message"
                    className="px-3 py-2 border rounded-lg md:col-span-2"
                  />
                </div>
                <Button onClick={handleSendMessage} disabled={submitting || !messageText.trim()}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Save Communication
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Timeline / Communication History</p>
                <div className="max-h-48 overflow-auto border rounded-lg divide-y">
                  {(selectedOrder.timeline || []).map((entry) => (
                    <div key={entry.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.status}</span>
                        <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-600 mt-1">{entry.notes || '-'}</p>
                    </div>
                  ))}
                  {(!selectedOrder.timeline || selectedOrder.timeline.length === 0) && (
                    <div className="p-3 text-sm text-gray-500">No timeline entries yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
