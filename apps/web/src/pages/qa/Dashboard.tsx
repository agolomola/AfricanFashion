import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  Clock,
  Package,
  Eye,
  Check,
  X,
  MessageSquare,
  Camera
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

interface QAStats {
  pendingReviews: number;
  approvedToday: number;
  rejectedToday: number;
  totalReviewed: number;
  avgReviewTime: number;
}

interface QAItem {
  id: string;
  orderNumber: string;
  designName: string;
  designerName: string;
  customerName: string;
  images: string[];
  measurements: Record<string, number>;
  submittedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface QAReview {
  id: string;
  orderNumber: string;
  designName: string;
  status: 'APPROVED' | 'REJECTED';
  reviewedAt: string;
  notes: string;
  reviewerName: string;
}

export default function QADashboard() {
  const [stats, setStats] = useState<QAStats | null>(null);
  const [pendingItems, setPendingItems] = useState<QAItem[]>([]);
  const [recentReviews, setRecentReviews] = useState<QAReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'history'>('overview');
  const [selectedItem, setSelectedItem] = useState<QAItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes, historyRes] = await Promise.all([
        api.qa.getStats(),
        api.qa.getPendingItems(),
        api.qa.getReviewHistory()
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (pendingRes.success) setPendingItems(pendingRes.data);
      if (historyRes.success) setRecentReviews(historyRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedItem) return;
    
    try {
      await api.qa.submitReview({
        orderId: selectedItem.id,
        status,
        notes: reviewNotes,
      });
      
      setShowReviewModal(false);
      setSelectedItem(null);
      setReviewNotes('');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const openReviewModal = (item: QAItem) => {
    setSelectedItem(item);
    setShowReviewModal(true);
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
        <h1 className="text-2xl font-bold text-gray-900">QA Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Online</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {(['overview', 'pending', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'pending' && pendingItems.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingItems.length}
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
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.pendingReviews || 0}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved Today</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats?.approvedToday || 0}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rejected Today</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats?.rejectedToday || 0}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Reviewed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalReviewed || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Review Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.avgReviewTime || 0}m</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Priority Alerts */}
          {pendingItems.some(item => item.priority === 'HIGH') && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">High Priority Items</p>
                <p className="text-sm text-red-700">
                  {pendingItems.filter(item => item.priority === 'HIGH').length} item(s) require urgent review.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                onClick={() => setActiveTab('pending')}
              >
                Review Now
              </Button>
            </div>
          )}

          {/* Recent Pending */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pending Reviews</h2>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('pending')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingItems.slice(0, 6).map((item) => (
                <div key={item.id} className="border rounded-xl overflow-hidden">
                  <div className="relative">
                    <img
                      src={item.images[0]}
                      alt={item.designName}
                      className="w-full h-48 object-cover"
                    />
                    <Badge 
                      variant={item.priority === 'HIGH' ? 'red' : item.priority === 'MEDIUM' ? 'yellow' : 'blue'}
                      className="absolute top-2 right-2"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{item.designName}</h3>
                    <p className="text-sm text-gray-500">by {item.designerName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted {new Date(item.submittedAt).toLocaleString()}
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => openReviewModal(item)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Pending Reviews</h2>
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div key={item.id} className="border rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={item.images[0]}
                    alt={item.designName}
                    className="w-32 h-40 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{item.designName}</h3>
                          <Badge 
                            variant={item.priority === 'HIGH' ? 'red' : item.priority === 'MEDIUM' ? 'yellow' : 'blue'}
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">Order: {item.orderNumber}</p>
                        <p className="text-sm text-gray-500">Designer: {item.designerName}</p>
                        <p className="text-sm text-gray-500">Customer: {item.customerName}</p>
                      </div>
                      <p className="text-sm text-gray-400">
                        {new Date(item.submittedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Measurements:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(item.measurements).slice(0, 6).map(([key, value]) => (
                          <span key={key} className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {key}: {value}cm
                          </span>
                        ))}
                        {Object.keys(item.measurements).length > 6 && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            +{Object.keys(item.measurements).length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button onClick={() => openReviewModal(item)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Full Review
                      </Button>
                      <Button variant="outline">
                        <Camera className="w-4 h-4 mr-1" />
                        View Photos
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Review History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Design</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Reviewed At</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Reviewer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map((review) => (
                  <tr key={review.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{review.orderNumber}</td>
                    <td className="py-3 px-4">{review.designName}</td>
                    <td className="py-3 px-4">
                      <Badge variant={review.status === 'APPROVED' ? 'green' : 'red'}>
                        {review.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(review.reviewedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{review.reviewerName}</td>
                    <td className="py-3 px-4 max-w-xs truncate">{review.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">QA Review: {selectedItem.orderNumber}</h3>
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {selectedItem.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Review ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">Measurements</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(selectedItem.measurements).map(([key, value]) => (
                    <div key={key} className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">{key}</p>
                      <p className="font-medium">{value} cm</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter your review notes..."
                  className="w-full px-4 py-2 border rounded-lg h-24 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleReview('REJECTED')}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handleReview('APPROVED')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
