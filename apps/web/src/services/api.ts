import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const httpClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
httpClient.interceptors.request.use(
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
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API methods
const apiRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.post<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete<T>(url, config).then((res) => res.data),
};

// Auth API
const authApi = {
  login: (email: string, password: string) =>
    apiRequest.post<{ success: boolean; data: { user: any; token: string } }>('/auth/login', { email, password }),

  register: (data: any) =>
    apiRequest.post<{ success: boolean; data: { user: any; token: string } }>('/auth/register', data),

  getMe: () =>
    apiRequest.get<{ success: boolean; data: any }>('/auth/me'),

  updateProfile: (data: any) =>
    apiRequest.patch<{ success: boolean; data: any }>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest.post('/auth/change-password', { currentPassword, newPassword }),

  logout: () =>
    apiRequest.post('/auth/logout'),
};

// Products API
const productsApi = {
  getCategories: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/products/categories'),

  getMaterials: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/products/materials'),

  getFabrics: (params?: { country?: string; materialTypeId?: string; search?: string; page?: number; limit?: number }) =>
    apiRequest.get<{ success: boolean; data: { fabrics: any[]; pagination: any } }>('/products/fabrics', { params }),

  getFabric: (id: string) =>
    apiRequest.get<{ success: boolean; data: any }>(`/products/fabrics/${id}`),

  getDesigns: (params?: { categoryId?: string; country?: string; search?: string; page?: number; limit?: number }) =>
    apiRequest.get<{ success: boolean; data: { designs: any[]; pagination: any } }>('/products/designs', { params }),

  getDesign: (id: string) =>
    apiRequest.get<{ success: boolean; data: any }>(`/products/designs/${id}`),

  getReadyToWear: (params?: { categoryId?: string; country?: string; search?: string; page?: number; limit?: number }) =>
    apiRequest.get<{ success: boolean; data: { products: any[]; pagination: any } }>('/products/ready-to-wear', { params }),

  getReadyToWearProduct: (id: string) =>
    apiRequest.get<{ success: boolean; data: any }>(`/products/ready-to-wear/${id}`),

  getCountries: () =>
    apiRequest.get<{ success: boolean; data: string[] }>('/products/countries'),

  getFeatured: () =>
    apiRequest.get<{ success: boolean; data: any }>('/products/featured'),
};

// Orders API
const ordersApi = {
  getOrder: (id: string) =>
    apiRequest.get<{ success: boolean; data: any }>(`/orders/${id}`),

  createCustomDesignOrder: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/orders/custom-design', data),

  createReadyToWearOrder: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/orders/ready-to-wear', data),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiRequest.patch(`/orders/${id}/status`, { status, notes }),

  addTracking: (id: string, trackingNumber: string) =>
    apiRequest.patch(`/orders/${id}/tracking`, { trackingNumber }),
};

// Customer API
const customerApi = {
  getProfile: () =>
    apiRequest.get<{ success: boolean; data: any }>('/customer/profile'),

  getAddresses: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/customer/addresses'),

  addAddress: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/customer/addresses', data),

  updateAddress: (id: string, data: any) =>
    apiRequest.patch<{ success: boolean; data: any }>(`/customer/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    apiRequest.delete(`/customer/addresses/${id}`),

  saveMeasurements: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/customer/measurements', data),

  getOrders: (params?: { page?: number; limit?: number }) =>
    apiRequest.get<{ success: boolean; data: { orders: any[]; pagination: any } }>('/customer/orders', { params }),

  acceptOrder: (id: string) =>
    apiRequest.post(`/customer/orders/${id}/accept`),

  requestRefund: (id: string, reason: string) =>
    apiRequest.post(`/customer/orders/${id}/refund`, { reason }),
};

// Admin API
const adminApi = {
  getDashboard: () =>
    apiRequest.get<{ success: boolean; data: any }>('/admin/dashboard'),

  getUsers: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiRequest.get<{ success: boolean; data: { users: any[]; pagination: any } }>('/admin/users', { params }),

  updateUserStatus: (id: string, status: string, reason?: string) =>
    apiRequest.patch(`/admin/users/${id}/status`, { status, reason }),

  getCategories: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/admin/categories'),

  createCategory: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/admin/categories', data),

  updateCategory: (id: string, data: any) =>
    apiRequest.patch(`/admin/categories/${id}`, data),

  deleteCategory: (id: string) =>
    apiRequest.delete(`/admin/categories/${id}`),

  getMaterials: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/admin/materials'),

  createMaterial: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/admin/materials', data),

  updateMaterial: (id: string, data: any) =>
    apiRequest.patch(`/admin/materials/${id}`, data),

  deleteMaterial: (id: string) =>
    apiRequest.delete(`/admin/materials/${id}`),

  getPricingRules: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/admin/pricing-rules'),

  createPricingRule: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/admin/pricing-rules', data),

  updatePricingRule: (id: string, data: any) =>
    apiRequest.patch(`/admin/pricing-rules/${id}`, data),

  deletePricingRule: (id: string) =>
    apiRequest.delete(`/admin/pricing-rules/${id}`),

  getOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiRequest.get<{ success: boolean; data: { orders: any[]; pagination: any } }>('/admin/orders', { params }),

  assignQA: (orderId: string, qaId: string) =>
    apiRequest.patch(`/admin/orders/${orderId}/assign-qa`, { qaId }),
};

// Fabric Seller API
const sellerApi = {
  getDashboard: () =>
    apiRequest.get<{ success: boolean; data: any }>('/fabric-seller/dashboard'),

  getFabrics: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/fabric-seller/fabrics'),

  createFabric: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/fabric-seller/fabrics', data),

  getOrders: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/fabric-seller/orders'),
};

// Designer API
const designerApi = {
  getDashboard: () =>
    apiRequest.get<{ success: boolean; data: any }>('/designer/dashboard'),

  getDesigns: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/designer/designs'),

  createDesign: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/designer/designs', data),

  getReadyToWear: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/designer/ready-to-wear'),

  createReadyToWear: (data: any) =>
    apiRequest.post<{ success: boolean; data: any }>('/designer/ready-to-wear', data),

  getOrders: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/designer/orders'),
};

// QA API
const qaApi = {
  getDashboard: () =>
    apiRequest.get<{ success: boolean; data: any }>('/qa/dashboard'),

  getOrders: (params?: { status?: string }) =>
    apiRequest.get<{ success: boolean; data: any[] }>('/qa/orders', { params }),

  shipOrder: (orderId: string, trackingNumber: string, notes?: string) =>
    apiRequest.patch(`/qa/orders/${orderId}/ship`, { trackingNumber, notes }),

  getStats: () =>
    apiRequest.get<{ success: boolean; data: any }>('/qa/stats'),

  getPendingItems: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/qa/pending'),

  getReviewHistory: () =>
    apiRequest.get<{ success: boolean; data: any[] }>('/qa/history'),

  submitReview: (data: { orderId: string; status: 'APPROVED' | 'REJECTED'; notes: string }) =>
    apiRequest.post<{ success: boolean; data: any }>('/qa/review', data),
};

// Payments API
const paymentsApi = {
  createPaymentIntent: (data: { amount: number; currency: string }) =>
    apiRequest.post<{ success: boolean; data: { clientSecret: string } }>('/payments/create-intent', data),

  confirmPayment: (paymentIntentId: string) =>
    apiRequest.post<{ success: boolean; data: any }>('/payments/confirm', { paymentIntentId }),
};

// Additional endpoints for dashboards
const extendedApi = {
  admin: {
    getDashboardStats: () =>
      apiRequest.get<{ success: boolean; data: any }>('/admin/stats'),
    getRecentOrders: () =>
      apiRequest.get<{ success: boolean; data: any[] }>('/admin/recent-orders'),
  },

  seller: {
    getStats: () =>
      apiRequest.get<{ success: boolean; data: any }>('/fabric-seller/stats'),
    getFabrics: () =>
      apiRequest.get<{ success: boolean; data: any[] }>('/fabric-seller/fabrics'),
    getOrders: () =>
      apiRequest.get<{ success: boolean; data: any[] }>('/fabric-seller/orders'),
    updateFabricStock: (fabricId: string, stock: number) =>
      apiRequest.patch(`/fabric-seller/fabrics/${fabricId}/stock`, { stock }),
    updateOrderStatus: (orderId: string, status: string) =>
      apiRequest.patch(`/fabric-seller/orders/${orderId}/status`, { status }),
  },

  designer: {
    getStats: () =>
      apiRequest.get<{ success: boolean; data: any }>('/designer/stats'),
    getDesigns: () =>
      apiRequest.get<{ success: boolean; data: any[] }>('/designer/designs'),
    getOrders: () =>
      apiRequest.get<{ success: boolean; data: any[] }>('/designer/orders'),
    updateOrderStatus: (orderId: string, status: string) =>
      apiRequest.patch(`/designer/orders/${orderId}/status`, { status }),
  },

  products: {
    getDesignById: (id: string) =>
      apiRequest.get<{ success: boolean; data: any }>(`/products/designs/${id}`),
    getFabricById: (id: string) =>
      apiRequest.get<{ success: boolean; data: any }>(`/products/fabrics/${id}`),
  },

  orders: {
    createOrder: (data: any) =>
      apiRequest.post<{ success: boolean; data: any }>('/orders', data),
  },

  customer: {
    getOrders: () =>
      apiRequest.get<{ success: boolean; data: any[] }>('/customer/orders'),
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
  banners: bannersApi,
  upload: uploadApi,
};

export default api;
