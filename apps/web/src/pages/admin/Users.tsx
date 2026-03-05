import { useEffect, useState } from 'react';
import { Edit2, Filter, Plus, Search, UserCheck, UserX, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  country?: string;
  createdAt: string;
  orderCount?: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'activate' | 'suspend' | 'reject' | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [formError, setFormError] = useState('');
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    password: '',
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    void fetchUsers();
  }, [search, roleFilter, statusFilter, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      });
      if (response.success) {
        const mappedUsers: User[] = response.data.users.map((user: any) => ({
          id: user.id,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          role: user.role,
          status: user.status,
          country: user.fabricSellerProfile?.country || user.designerProfile?.country || '-',
          createdAt: user.createdAt,
          orderCount: Number(user?._count?.ordersAsCustomer || 0),
        }));
        setUsers(mappedUsers);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      let newStatus = selectedUser.status;
      if (actionType === 'activate') newStatus = 'ACTIVE';
      if (actionType === 'suspend') newStatus = 'SUSPENDED';
      if (actionType === 'reject') newStatus = 'REJECTED';

      await api.admin.updateUserStatus(selectedUser.id, newStatus);
      await fetchUsers();
      setShowActionModal(false);
      setSelectedUser(null);
      setActionType(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const openActionModal = (user: User, action: 'activate' | 'suspend' | 'reject') => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setFormError('');
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      password: '',
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (user: User) => {
    const [firstName, ...rest] = user.fullName.split(' ');
    setEditingUser(user);
    setFormError('');
    setUserForm({
      firstName: firstName || '',
      lastName: rest.join(' ') || '',
      email: user.email,
      role: user.role,
      status: user.status,
      password: '',
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      setSavingUser(true);
      setFormError('');
      if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.email.trim()) {
        setFormError('Please fill first name, last name, and email.');
        return;
      }

      if (editingUser) {
        await api.admin.updateUser(editingUser.id, {
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          email: userForm.email.trim(),
          role: userForm.role as any,
          status: userForm.status as any,
        });
      } else {
        if (!userForm.password || userForm.password.length < 8) {
          setFormError('Password must be at least 8 characters for new users.');
          return;
        }
        await api.admin.createUser({
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          email: userForm.email.trim(),
          role: userForm.role as any,
          status: userForm.status as any,
          password: userForm.password,
        });
      }

      setShowUserModal(false);
      await fetchUsers();
    } catch (error: any) {
      setFormError(error?.response?.data?.message || 'Failed to save user.');
    } finally {
      setSavingUser(false);
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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Button onClick={openCreateUserModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="FABRIC_SELLER">Fabric Seller</option>
          <option value="FASHION_DESIGNER">Designer</option>
          <option value="QA_TEAM">QA Team</option>
          <option value="ADMINISTRATOR">Administrator</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button variant="outline" onClick={fetchUsers}>
          <Filter className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <Filter className="w-4 h-4 mr-2" />
          Apply Filter
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Country</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Orders</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Joined</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="font-medium text-amber-700">
                          {user.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{user.role}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant={
                        user.status === 'ACTIVE' ? 'green' :
                        user.status === 'SUSPENDED' ? 'red' :
                        user.status === 'REJECTED' ? 'gray' : 'yellow'
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{user.country || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{user.orderCount || 0}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditUserModal(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user.status !== 'ACTIVE' && (
                        <button
                          onClick={() => openActionModal(user, 'activate')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Activate"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      {user.status !== 'SUSPENDED' && (
                        <button
                          onClick={() => openActionModal(user, 'suspend')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Suspend/Inactivate"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                      {user.status !== 'REJECTED' && user.status !== 'ACTIVE' && user.role !== 'CUSTOMER' && (
                        <button
                          onClick={() => openActionModal(user, 'reject')}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {Math.max(1, pagination.pages)} • {pagination.total} users
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

      {/* Action Modal */}
      {showActionModal && selectedUser && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {actionType === 'activate' && 'Activate User'}
              {actionType === 'suspend' && 'Suspend User'}
              {actionType === 'reject' && 'Reject User'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {actionType} <strong>{selectedUser.fullName}</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowActionModal(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleAction}
                variant={actionType === 'suspend' || actionType === 'reject' ? 'outline' : 'default'}
              >
                {actionType === 'activate' && <UserCheck className="w-4 h-4 mr-2" />}
                {actionType === 'suspend' && <UserX className="w-4 h-4 mr-2" />}
                {actionType === 'reject' && <XCircle className="w-4 h-4 mr-2" />}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Add User'}</h3>
            {formError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <input
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                placeholder="First name"
                className="px-3 py-2 border rounded-lg"
              />
              <input
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                placeholder="Last name"
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <input
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="Email"
              className="w-full px-3 py-2 border rounded-lg"
            />
            {!editingUser && (
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Password (min 8 chars)"
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="FABRIC_SELLER">Fabric Seller</option>
                <option value="FASHION_DESIGNER">Designer</option>
                <option value="QA_TEAM">QA Team</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
              <select
                value={userForm.status}
                onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended / Inactive</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowUserModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveUser} disabled={savingUser}>
                {savingUser ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
