import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiService = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res) => res.data),
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiService.post<{ success: boolean; data: { user: any; token: string } }>('/auth/login', { email, password }),

  register: (data: any) =>
    apiService.post<{ success: boolean; data: { user: any; token: string } }>('/auth/register', data),

  getMe: () =>
    apiService.get<{ success: boolean; data: any }>('/auth/me'),

  updateProfile: (data: any) =>
    apiService.patch<{ success: boolean; data: any }>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiService.post('/auth/change-password', { currentPassword, newPassword }),

  logout: () =>
    apiService.post('/auth/logout'),
};

// Products API
export const productsApi = {
  getCategories: () =>
    apiService.get<{ success: boolean; data: any[] }>('/products/categories'),

  getMaterials: () =>
    apiService.get<{ success: boolean; data: any[] }>('/products/materials'),

  getFabrics: (params?: { country?: string; materialTypeId?: string; search?: string; page?: number; limit?: number }) =>
    apiService.get<{ success: boolean; data: { fabrics: any[]; pagination: any } }>('/products/fabrics', { params }),

  getFabric: (id: string) =>
    apiService.get<{ success: boolean; data: any }>(`/products/fabrics/${id}`),

  getDesigns: (params?: { categoryId?: string; country?: string; search?: string; page?: number; limit?: number }) =>
    apiService.get<{ success: boolean; data: { designs: any[]; pagination: any } }>('/products/designs', { params }),

  getDesign: (id: string) =>
    apiService.get<{ success: boolean; data: any }>(`/products/designs/${id}`),

  getReadyToWear: (params?: { categoryId?: string; country?: string; search?: string; page?: number; limit?: number }) =>
    apiService.get<{ success: boolean; data: { products: any[]; pagination: any } }>('/products/ready-to-wear', { params }),

  getReadyToWearProduct: (id: string) =>
    apiService.get<{ success: boolean; data: any }>(`/products/ready-to-wear/${id}`),

  getCountries: () =>
    apiService.get<{ success: boolean; data: string[] }>('/products/countries'),

  getFeatured: () =>
    apiService.get<{ success: boolean; data: any }>('/products/featured'),
};

// Orders API
export const ordersApi = {
  getOrder: (id: string) =>
    apiService.get<{ success: boolean; data: any }>(`/orders/${id}`),

  createCustomDesignOrder: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/orders/custom-design', data),

  createReadyToWearOrder: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/orders/ready-to-wear', data),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiService.patch(`/orders/${id}/status`, { status, notes }),

  addTracking: (id: string, trackingNumber: string) =>
    apiService.patch(`/orders/${id}/tracking`, { trackingNumber }),
};

// Customer API
export const customerApi = {
  getProfile: () =>
    apiService.get<{ success: boolean; data: any }>('/customer/profile'),

  getAddresses: () =>
    apiService.get<{ success: boolean; data: any[] }>('/customer/addresses'),

  addAddress: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/customer/addresses', data),

  updateAddress: (id: string, data: any) =>
    apiService.patch<{ success: boolean; data: any }>(`/customer/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    apiService.delete(`/customer/addresses/${id}`),

  saveMeasurements: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/customer/measurements', data),

  getOrders: (params?: { page?: number; limit?: number }) =>
    apiService.get<{ success: boolean; data: { orders: any[]; pagination: any } }>('/customer/orders', { params }),

  acceptOrder: (id: string) =>
    apiService.post(`/customer/orders/${id}/accept`),

  requestRefund: (id: string, reason: string) =>
    apiService.post(`/customer/orders/${id}/refund`, { reason }),
};

// Admin API
export const adminApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/admin/dashboard'),

  getUsers: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiService.get<{ success: boolean; data: { users: any[]; pagination: any } }>('/admin/users', { params }),

  updateUserStatus: (id: string, status: string, reason?: string) =>
    apiService.patch(`/admin/users/${id}/status`, { status, reason }),

  getCategories: () =>
    apiService.get<{ success: boolean; data: any[] }>('/admin/categories'),

  createCategory: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/admin/categories', data),

  updateCategory: (id: string, data: any) =>
    apiService.patch(`/admin/categories/${id}`, data),

  deleteCategory: (id: string) =>
    apiService.delete(`/admin/categories/${id}`),

  getMaterials: () =>
    apiService.get<{ success: boolean; data: any[] }>('/admin/materials'),

  createMaterial: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/admin/materials', data),

  updateMaterial: (id: string, data: any) =>
    apiService.patch(`/admin/materials/${id}`, data),

  deleteMaterial: (id: string) =>
    apiService.delete(`/admin/materials/${id}`),

  getPricingRules: () =>
    apiService.get<{ success: boolean; data: any[] }>('/admin/pricing-rules'),

  createPricingRule: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/admin/pricing-rules', data),

  updatePricingRule: (id: string, data: any) =>
    apiService.patch(`/admin/pricing-rules/${id}`, data),

  deletePricingRule: (id: string) =>
    apiService.delete(`/admin/pricing-rules/${id}`),

  getOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiService.get<{ success: boolean; data: { orders: any[]; pagination: any } }>('/admin/orders', { params }),

  assignQA: (orderId: string, qaId: string) =>
    apiService.patch(`/admin/orders/${orderId}/assign-qa`, { qaId }),
};

// Fabric Seller API
export const sellerApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/fabric-seller/dashboard'),

  getFabrics: () =>
    apiService.get<{ success: boolean; data: any[] }>('/fabric-seller/fabrics'),

  createFabric: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/fabric-seller/fabrics', data),

  getOrders: () =>
    apiService.get<{ success: boolean; data: any[] }>('/fabric-seller/orders'),
};

// Designer API
export const designerApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/designer/dashboard'),

  getDesigns: () =>
    apiService.get<{ success: boolean; data: any[] }>('/designer/designs'),

  createDesign: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/designer/designs', data),

  getReadyToWear: () =>
    apiService.get<{ success: boolean; data: any[] }>('/designer/ready-to-wear'),

  createReadyToWear: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/designer/ready-to-wear', data),

  getOrders: () =>
    apiService.get<{ success: boolean; data: any[] }>('/designer/orders'),
};

// QA API
export const qaApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/qa/dashboard'),

  getOrders: (params?: { status?: string }) =>
    apiService.get<{ success: boolean; data: any[] }>('/qa/orders', { params }),

  shipOrder: (orderId: string, trackingNumber: string, notes?: string) =>
    apiService.patch(`/qa/orders/${orderId}/ship`, { trackingNumber, notes }),

  getStats: () =>
    apiService.get<{ success: boolean; data: any }>('/qa/stats'),

  getPendingItems: () =>
    apiService.get<{ success: boolean; data: any[] }>('/qa/pending'),

  getReviewHistory: () =>
    apiService.get<{ success: boolean; data: any[] }>('/qa/history'),

  submitReview: (data: { orderId: string; status: 'APPROVED' | 'REJECTED'; notes: string }) =>
    apiService.post<{ success: boolean; data: any }>('/qa/review', data),
};

// Payments API
export const paymentsApi = {
  createPaymentIntent: (data: { amount: number; currency: string }) =>
    apiService.post<{ success: boolean; data: { clientSecret: string } }>('/payments/create-intent', data),

  confirmPayment: (paymentIntentId: string) =>
    apiService.post<{ success: boolean; data: any }>('/payments/confirm', { paymentIntentId }),
};

// Additional endpoints for dashboards
export const extendedApi = {
  // Admin
  admin: {
    getDashboardStats: () =>
      apiService.get<{ success: boolean; data: any }>('/admin/stats'),
    getRecentOrders: () =>
      apiService.get<{ success: boolean; data: any[] }>('/admin/recent-orders'),
  },

  // Seller
  seller: {
    getStats: () =>
      apiService.get<{ success: boolean; data: any }>('/fabric-seller/stats'),
    getFabrics: () =>
      apiService.get<{ success: boolean; data: any[] }>('/fabric-seller/fabrics'),
    getOrders: () =>
      apiService.get<{ success: boolean; data: any[] }>('/fabric-seller/orders'),
    updateFabricStock: (fabricId: string, stock: number) =>
      apiService.patch(`/fabric-seller/fabrics/${fabricId}/stock`, { stock }),
    updateOrderStatus: (orderId: string, status: string) =>
      apiService.patch(`/fabric-seller/orders/${orderId}/status`, { status }),
  },

  // Designer
  designer: {
    getStats: () =>
      apiService.get<{ success: boolean; data: any }>('/designer/stats'),
    getDesigns: () =>
      apiService.get<{ success: boolean; data: any[] }>('/designer/designs'),
    getOrders: () =>
      apiService.get<{ success: boolean; data: any[] }>('/designer/orders'),
    updateOrderStatus: (orderId: string, status: string) =>
      apiService.patch(`/designer/orders/${orderId}/status`, { status }),
  },

  // Products
  products: {
    getDesignById: (id: string) =>
      apiService.get<{ success: boolean; data: any }>(`/products/designs/${id}`),
    getFabricById: (id: string) =>
      apiService.get<{ success: boolean; data: any }>(`/products/fabrics/${id}`),
  },

  // Orders
  orders: {
    createOrder: (data: any) =>
      apiService.post<{ success: boolean; data: any }>('/orders', data),
  },

  // Customer
  customer: {
    getOrders: () =>
      apiService.get<{ success: boolean; data: any[] }>('/customer/orders'),
  },
};

// Export combined API
export const api = {
  auth: authApi,
  products: { ...productsApi, ...extendedApi.products },
  orders: { ...ordersApi, ...extendedApi.orders },
  customer: { ...customerApi, ...extendedApi.customer },
  admin: { ...adminApi, ...extendedApi.admin },
  seller: { ...sellerApi, ...extendedApi.seller },
  designer: { ...designerApi, ...extendedApi.designer },
  qa: qaApi,
  payments: paymentsApi,
};

export default api;
