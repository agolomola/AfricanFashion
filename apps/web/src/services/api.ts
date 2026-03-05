import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const defaultApiUrl = import.meta.env.DEV
  ? 'http://localhost:3001/api'
  : `${window.location.origin}/api`;
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveAssetUrl(url: string | undefined | null): string {
  if (!url) {
    return '';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return `${API_ORIGIN}/${url}`;
}

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
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthRequest) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Generic API methods
const apiService = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.post<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.patch<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.put<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete<T>(url, config).then((res) => res.data),
};

// Auth API
type AuthAccess = {
  homeRoute?: string;
  permissions?: string[];
};

type AuthPayload = {
  user: any;
  token: string | null;
  access?: AuthAccess;
};

const authApi = {
  login: (email: string, password: string) =>
    apiService.post<{ success: boolean; data: AuthPayload }>('/auth/login', { email, password }),

  register: (data: any) =>
    apiService.post<{ success: boolean; data: AuthPayload }>('/auth/register', data),

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
const productsApi = {
  getCategories: () =>
    apiService.get<{ success: boolean; data: any[] }>('/products/categories'),

  getMaterials: () =>
    apiService.get<{ success: boolean; data: any[] }>('/products/materials'),

  getFabrics: async (params?: { country?: string; materialTypeId?: string; search?: string; page?: number; limit?: number }) => {
    const response = await apiService.get<{ success: boolean; data: { fabrics: any[]; pagination: any } }>('/products/fabrics', { params });
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: {
        fabrics: (response.data?.fabrics || []).map((fabric: any) => ({
          ...fabric,
          sellerPrice: Number(fabric?.sellerPrice || 0),
          finalPrice: Number(fabric?.finalPrice || 0),
          minYards: Number(fabric?.minYards || 1),
          stockYards: Number(fabric?.stockYards || 0),
          images: (fabric?.images || []).map((img: any) => ({
            ...img,
            url: resolveAssetUrl(img?.url),
          })),
        })),
        pagination: response.data?.pagination,
      },
    };
  },

  getFabric: async (id: string) => {
    const response = await apiService.get<{ success: boolean; data: any }>(`/products/fabrics/${id}`);
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: {
        ...response.data,
        sellerPrice: Number(response.data?.sellerPrice || 0),
        finalPrice: Number(response.data?.finalPrice || 0),
        minYards: Number(response.data?.minYards || 1),
        stockYards: Number(response.data?.stockYards || 0),
        images: (response.data?.images || []).map((img: any) => ({
          ...img,
          url: resolveAssetUrl(img?.url),
        })),
      },
    };
  },

  getFabricById: (id: string) => productsApi.getFabric(id),

  getDesigns: async (params?: { categoryId?: string; country?: string; search?: string; page?: number; limit?: number }) => {
    const response = await apiService.get<{ success: boolean; data: { designs: any[]; pagination: any } }>('/products/designs', { params });
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: {
        designs: (response.data?.designs || []).map((design: any) => ({
          ...design,
          basePrice: Number(design?.basePrice || 0),
          finalPrice: Number(design?.finalPrice || 0),
          images: (design?.images || []).map((img: any) => ({
            ...img,
            url: resolveAssetUrl(img?.url),
          })),
          suitableFabrics: (design?.suitableFabrics || []).map((sf: any) => ({
            ...sf,
            fabric: sf?.fabric
              ? {
                  ...sf.fabric,
                  finalPrice: Number(sf.fabric?.finalPrice || 0),
                  images: (sf.fabric?.images || []).map((img: any) => ({
                    ...img,
                    url: resolveAssetUrl(img?.url),
                  })),
                }
              : sf?.fabric,
          })),
        })),
        pagination: response.data?.pagination,
      },
    };
  },

  getDesign: async (id: string) => {
    const response = await apiService.get<{ success: boolean; data: any }>(`/products/designs/${id}`);
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: {
        ...response.data,
        basePrice: Number(response.data?.basePrice || 0),
        finalPrice: Number(response.data?.finalPrice || 0),
        images: (response.data?.images || []).map((img: any) => ({
          ...img,
          url: resolveAssetUrl(img?.url),
        })),
        suitableFabrics: (response.data?.suitableFabrics || []).map((sf: any) => ({
          ...sf,
          fabric: sf?.fabric
            ? {
                ...sf.fabric,
                finalPrice: Number(sf.fabric?.finalPrice || 0),
                images: (sf.fabric?.images || []).map((img: any) => ({
                  ...img,
                  url: resolveAssetUrl(img?.url),
                })),
              }
            : sf?.fabric,
        })),
      },
    };
  },

  getDesignById: (id: string) => productsApi.getDesign(id),

  getReadyToWear: async (params?: { categoryId?: string; country?: string; search?: string; page?: number; limit?: number }) => {
    const response = await apiService.get<{ success: boolean; data: { products: any[]; pagination: any } }>('/products/ready-to-wear', { params });
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: {
        products: (response.data?.products || []).map((product: any) => ({
          ...product,
          basePrice: Number(product?.basePrice || 0),
          images: (product?.images || []).map((img: any) => ({
            ...img,
            url: resolveAssetUrl(img?.url),
          })),
          sizeVariations: (product?.sizeVariations || []).map((size: any) => ({
            ...size,
            price: Number(size?.price || 0),
            stock: Number(size?.stock || 0),
          })),
        })),
        pagination: response.data?.pagination,
      },
    };
  },

  getReadyToWearProduct: async (id: string) => {
    const response = await apiService.get<{ success: boolean; data: any }>(`/products/ready-to-wear/${id}`);
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: {
        ...response.data,
        basePrice: Number(response.data?.basePrice || 0),
        images: (response.data?.images || []).map((img: any) => ({
          ...img,
          url: resolveAssetUrl(img?.url),
        })),
        sizeVariations: (response.data?.sizeVariations || []).map((size: any) => ({
          ...size,
          price: Number(size?.price || 0),
          stock: Number(size?.stock || 0),
        })),
      },
    };
  },

  getCountries: () =>
    apiService.get<{ success: boolean; data: string[] }>('/products/countries'),

  getFeatured: () =>
    apiService.get<{ success: boolean; data: any }>('/products/featured'),
};

// Orders API
const ordersApi = {
  getOrder: (id: string) =>
    apiService.get<{ success: boolean; data: any }>(`/orders/${id}`),

  createOrder: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/orders/custom-design', data),

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
const customerApi = {
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
const adminApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/admin/dashboard'),

  getDashboardStats: async (range: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiService.get<{ success: boolean; data: any }>('/admin/dashboard', {
      params: { range },
    });
    if (!response.success) {
      return response;
    }

    const data = response.data;
    return {
      success: true,
      data: {
        totalRevenue: Number(data?.orders?.revenue || 0),
        totalOrders: Number(data?.orders?.total || 0),
        totalUsers: Number(data?.users?.total || 0),
        totalProducts: Number(data?.products?.total || 0),
        pendingOrders: Number(data?.pendingOrders || 0),
        inProductionOrders: Number(data?.inProductionOrders || 0),
        revenueChange: Number(data?.revenueChange || 0),
        orderChange: Number(data?.orderChange || 0),
        userChange: Number(data?.userChange || 0),
        productChange: Number(data?.productChange || 0),
        monthlyRevenue: (data?.monthlyRevenue || []).map((item: any) => ({
          label: String(item?.label || ''),
          value: Number(item?.value || 0),
        })),
        ordersByStatus: (data?.ordersByStatus || []).map((item: any) => ({
          label: String(item?.label || ''),
          value: Number(item?.value || 0),
          color: item?.color,
        })),
        usersByRole: (data?.usersByRole || [
          { label: 'Customers', value: Number(data?.users?.customers || 0) },
          { label: 'Designers', value: Number(data?.users?.designers || 0) },
          { label: 'Sellers', value: Number(data?.users?.fabricSellers || 0) },
          { label: 'QA Team', value: Number(data?.users?.qa || 0) },
        ]).map((item: any) => ({
          label: String(item?.label || ''),
          value: Number(item?.value || 0),
          color: item?.color,
        })),
      },
    };
  },

  getRecentOrders: async (range: '24h' | '7d' | '30d' | '90d' = '7d') => {
    const response = await apiService.get<{ success: boolean; data: any }>('/admin/dashboard', {
      params: { range },
    });
    if (!response.success) {
      return response;
    }

    const recentOrders = (response.data?.recentOrders || []).map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown',
      totalAmount: Number(order.total || 0),
      status: order.status,
      createdAt: order.createdAt,
      items: 1,
    }));

    return {
      success: true,
      data: recentOrders,
    };
  },

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

  getOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiService.get<{ success: boolean; data: { orders: any[]; pagination: any } }>('/admin/orders', { params });
    if (!response.success) {
      return response;
    }

    const mappedOrders = (response.data?.orders || []).map((order: any) => {
      const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown';
      const designerName =
        `${order.designOrder?.design?.designer?.user?.firstName || order.readyToWearItems?.[0]?.readyToWear?.designer?.user?.firstName || ''} ${order.designOrder?.design?.designer?.user?.lastName || order.readyToWearItems?.[0]?.readyToWear?.designer?.user?.lastName || ''}`.trim() || 'N/A';
      const fabricSellerName =
        `${order.fabricOrder?.fabric?.seller?.user?.firstName || ''} ${order.fabricOrder?.fabric?.seller?.user?.lastName || ''}`.trim() || 'N/A';
      const qaStatus = String(order.status || 'N/A').startsWith('QA_') ? order.status : 'N/A';

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName,
        designName: order.designOrder?.design?.name || order.readyToWearItems?.[0]?.readyToWear?.name || 'N/A',
        designerName,
        fabricSellerName,
        totalAmount: Number(order.total || 0),
        status: String(order.status || 'UNKNOWN'),
        designStatus: order.designOrder?.status || 'N/A',
        fabricStatus: order.fabricOrder?.status || 'N/A',
        qaStatus,
        createdAt: order.createdAt,
      };
    });

    return {
      success: true,
      data: {
        orders: mappedOrders,
        pagination: response.data?.pagination,
      },
    };
  },

  assignQA: (orderId: string, qaId: string) =>
    apiService.patch(`/admin/orders/${orderId}/assign-qa`, { qaId }),

  // Banner Management
  getBanners: () =>
    apiService.get<{ success: boolean; data: any[] }>('/banners/admin/all'),

  createBanner: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/banners', data),

  updateBanner: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/banners/${id}`, data),

  deleteBanner: (id: string) =>
    apiService.delete<{ success: boolean }>(`/banners/${id}`),

  toggleBanner: (id: string) =>
    apiService.patch<{ success: boolean; data: any }>(`/banners/${id}/toggle`),
};

// Fabric Seller API
const sellerApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/fabric-seller/dashboard'),

  getFabrics: async () => {
    const response = await apiService.get<{ success: boolean; data: any[] }>('/fabric-seller/fabrics');
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: (response.data || []).map((fabric: any) => ({
        id: fabric.id,
        name: fabric.name,
        pricePerMeter: Number(fabric.finalPrice || fabric.sellerPrice || 0),
        stockMeters: Number(fabric.stockYards || 0),
        images: (fabric.images || []).map((img: any) => resolveAssetUrl(img.url)).filter(Boolean),
        orderCount: Number(fabric?._count?.orderItems || 0),
        status: fabric.status === 'APPROVED' ? 'ACTIVE' : fabric.status,
        materialType: fabric.materialType,
        minOrderMeters: Number(fabric.minYards || 1),
      })),
    };
  },

  createFabric: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/fabric-seller/fabrics', data),

  getOrders: async () => {
    const response = await apiService.get<{ success: boolean; data: any[] }>('/fabric-seller/orders');
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: (response.data || []).map((item: any) => ({
        id: item.id,
        orderNumber: item.order?.orderNumber || 'N/A',
        fabricName: item.fabric?.name || 'Unknown Fabric',
        meters: Number(item.yards || 0),
        totalAmount: Number(item.totalPrice || 0),
        status: item.status || 'PENDING',
        designerCountry: item.order?.designOrder?.design?.designer?.country || '',
        createdAt: item.order?.createdAt || item.createdAt,
        customerName: `${item.order?.customer?.firstName || ''} ${item.order?.customer?.lastName || ''}`.trim() || 'Unknown',
      })),
    };
  },

  getStats: async () => {
    try {
      return await apiService.get<{ success: boolean; data: any }>('/fabric-seller/stats');
    } catch {
      const fallback = await apiService.get<{ success: boolean; data: any }>('/fabric-seller/dashboard');
      if (!fallback.success) {
        return fallback;
      }
      const stats = fallback.data?.stats || {};
      return {
        success: true,
        data: {
          totalFabrics: Number(stats.totalFabrics || 0),
          totalSales: Number(stats.totalOrders || 0),
          totalRevenue: Number(stats.totalRevenue || 0),
          pendingOrders: Number(stats.pendingOrders || 0),
          lowStockItems: 0,
          monthlySales: [],
          topFabrics: [],
          salesChange: 0,
          revenueChange: 0,
        },
      };
    }
  },

  updateFabricStock: (fabricId: string, stock: number) =>
    apiService.patch(`/fabric-seller/fabrics/${fabricId}/stock`, { stock }),

  updateOrderStatus: (orderId: string, status: string) =>
    apiService.patch(`/fabric-seller/orders/${orderId}/status`, { status }),
};

// Designer API
const designerApi = {
  getDashboard: () =>
    apiService.get<{ success: boolean; data: any }>('/designer/dashboard'),

  getDesigns: async () => {
    const response = await apiService.get<{ success: boolean; data: any[] }>('/designer/designs');
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: (response.data || []).map((design: any) => ({
        id: design.id,
        name: design.name,
        basePrice: Number(design.basePrice || 0),
        images: (design.images || []).map((img: any) => resolveAssetUrl(img.url)).filter(Boolean),
        category: design.category,
        rating: Number(design.designer?.rating || 0),
        orderCount: Number(design?._count?.orderItems || 0),
        status: design.status === 'APPROVED' ? 'ACTIVE' : design.status,
        createdAt: design.createdAt,
      })),
    };
  },

  createDesign: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/designer/designs', data),

  getReadyToWear: async () => {
    const response = await apiService.get<{ success: boolean; data: any[] }>('/designer/ready-to-wear');
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: (response.data || []).map((product: any) => ({
        ...product,
        images: (product.images || []).map((img: any) => ({
          ...img,
          url: resolveAssetUrl(img.url),
        })),
      })),
    };
  },

  createReadyToWear: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/designer/ready-to-wear', data),

  getOrders: async () => {
    const response = await apiService.get<{ success: boolean; data: any[] }>('/designer/orders');
    if (!response.success) {
      return response;
    }
    return {
      success: true,
      data: (response.data || []).map((item: any) => {
        const createdAt = item.order?.createdAt || item.createdAt;
        const createdDate = new Date(createdAt);
        const dueDate = new Date(createdDate);
        dueDate.setDate(createdDate.getDate() + 14);
        const ageMs = Date.now() - createdDate.getTime();
        const priority = ageMs > 10 * 24 * 60 * 60 * 1000 ? 'HIGH' : ageMs > 5 * 24 * 60 * 60 * 1000 ? 'MEDIUM' : 'LOW';
        return {
          id: item.id,
          orderNumber: item.order?.orderNumber || 'N/A',
          designName: item.design?.name || 'Unknown Design',
          customerName: `${item.order?.customer?.firstName || ''} ${item.order?.customer?.lastName || ''}`.trim() || 'Unknown',
          measurements: item.measurements || {},
          fabricInfo: item.order?.fabricOrder?.fabric?.name || 'N/A',
          totalAmount: Number(item.order?.total || item.price || 0),
          status: item.status || 'PENDING',
          createdAt,
          dueDate: dueDate.toISOString(),
          priority,
        };
      }),
    };
  },

  getStats: async () => {
    try {
      return await apiService.get<{ success: boolean; data: any }>('/designer/stats');
    } catch {
      const fallback = await apiService.get<{ success: boolean; data: any }>('/designer/dashboard');
      if (!fallback.success) {
        return fallback;
      }
      const stats = fallback.data?.stats || {};
      return {
        success: true,
        data: {
          totalDesigns: Number(stats.totalDesigns || 0),
          totalOrders: Number(stats.totalOrders || 0),
          totalRevenue: Number(stats.totalRevenue || 0),
          pendingOrders: Number(stats.pendingOrders || 0),
          inProductionOrders: 0,
          completedOrders: 0,
          monthlyRevenue: [],
          topDesigns: [],
          rating: Number(fallback.data?.profile?.rating || 0),
          revenueChange: 0,
          orderChange: 0,
        },
      };
    }
  },

  updateOrderStatus: (orderId: string, status: string) =>
    apiService.patch(`/designer/orders/${orderId}/status`, { status }),
};

// QA API
const qaApi = {
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
const paymentsApi = {
  createPaymentIntent: (data: { amount: number; currency: string }) =>
    apiService.post<{ success: boolean; data: { clientSecret: string; paymentIntentId: string } }>('/payments/create-intent', data),

  confirmPayment: (paymentIntentId: string) =>
    apiService.post<{ success: boolean; data: any }>('/payments/confirm', { paymentIntentId }),
};

// Banners API (public)
const bannersApi = {
  getBanners: (section?: string) =>
    apiService.get<{ success: boolean; data: any[] }>('/banners', { params: section ? { section } : undefined }),

  getBannerSections: () =>
    apiService.get<{ success: boolean; data: any[] }>('/banners/meta/sections'),
};

// Upload API
const uploadApi = {
  image: (formData: FormData) =>
    httpClient.post<{ success: boolean; data: { url: string } }>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res) => ({
      ...res.data,
      data: {
        ...res.data.data,
        url: resolveAssetUrl(res.data.data?.url),
      },
    })),
};

// Homepage API
const homepageApi = {
  // Public endpoints
  getHeroSlides: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage/hero-slides'),

  getFeaturedBySection: (section: string) =>
    apiService.get<{ success: boolean; data: any[] }>(`/homepage/featured/${section}`),

  getAllFeatured: () =>
    apiService.get<{ success: boolean; data: any }>('/homepage/featured'),

  // Admin endpoints
  getAdminHeroSlides: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage/admin/hero-slides'),

  createHeroSlide: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage/admin/hero-slides', data),

  updateHeroSlide: (id: string, data: any) =>
    apiService.patch<{ success: boolean; data: any }>(`/homepage/admin/hero-slides/${id}`, data),

  deleteHeroSlide: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage/admin/hero-slides/${id}`),

  getAdminFeatured: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage/admin/featured'),

  addFeaturedProduct: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage/admin/featured', data),

  updateFeaturedProduct: (id: string, data: any) =>
    apiService.patch<{ success: boolean; data: any }>(`/homepage/admin/featured/${id}`, data),

  removeFeaturedProduct: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage/admin/featured/${id}`),

  getProductsForFeaturing: (type?: string) =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage/admin/products-for-featured', { params: type ? { type } : undefined }),
};

// Homepage Sections API (new dynamic sections)
const homepageSectionsApi = {
  // Public endpoints
  getCountries: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/countries'),

  getHowItWorks: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/how-it-works'),

  getCategories: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/categories'),

  getDesignerSpotlight: () =>
    apiService.get<{ success: boolean; data: any }>('/homepage-sections/designer-spotlight'),

  getHeritage: () =>
    apiService.get<{ success: boolean; data: any }>('/homepage-sections/heritage'),

  getTestimonials: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/testimonials'),

  getFooter: () =>
    apiService.get<{ success: boolean; data: any }>('/homepage-sections/footer'),

  // Admin endpoints - Countries
  getAdminCountries: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/admin/countries'),

  createCountry: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/countries', data),

  updateCountry: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/countries/${id}`, data),

  deleteCountry: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage-sections/admin/countries/${id}`),

  // Admin endpoints - How It Works
  getAdminHowItWorks: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/admin/how-it-works'),

  createHowItWorksStep: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/how-it-works', data),

  updateHowItWorksStep: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/how-it-works/${id}`, data),

  deleteHowItWorksStep: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage-sections/admin/how-it-works/${id}`),

  // Admin endpoints - Categories
  getAdminCategories: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/admin/categories'),

  createCategory: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/categories', data),

  updateCategory: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/categories/${id}`, data),

  deleteCategory: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage-sections/admin/categories/${id}`),

  // Admin endpoints - Designer Spotlight
  getAdminDesignerSpotlights: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/admin/designer-spotlight'),

  createDesignerSpotlight: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/designer-spotlight', data),

  updateDesignerSpotlight: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/designer-spotlight/${id}`, data),

  deleteDesignerSpotlight: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage-sections/admin/designer-spotlight/${id}`),

  // Admin endpoints - Heritage
  getAdminHeritage: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/admin/heritage'),

  createHeritage: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/heritage', data),

  updateHeritage: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/heritage/${id}`, data),

  deleteHeritage: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage-sections/admin/heritage/${id}`),

  // Admin endpoints - Testimonials
  getAdminTestimonials: () =>
    apiService.get<{ success: boolean; data: any[] }>('/homepage-sections/admin/testimonials'),

  createTestimonial: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/testimonials', data),

  updateTestimonial: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/testimonials/${id}`, data),

  deleteTestimonial: (id: string) =>
    apiService.delete<{ success: boolean }>(`/homepage-sections/admin/testimonials/${id}`),

  // Admin endpoints - Footer
  getAdminFooter: () =>
    apiService.get<{ success: boolean; data: any }>('/homepage-sections/admin/footer'),

  createFooter: (data: any) =>
    apiService.post<{ success: boolean; data: any }>('/homepage-sections/admin/footer', data),

  updateFooter: (id: string, data: any) =>
    apiService.put<{ success: boolean; data: any }>(`/homepage-sections/admin/footer/${id}`, data),
};

// Export combined API
export const api = {
  auth: authApi,
  products: productsApi,
  orders: ordersApi,
  customer: customerApi,
  admin: adminApi,
  seller: sellerApi,
  designer: designerApi,
  qa: qaApi,
  payments: paymentsApi,
  banners: bannersApi,
  upload: uploadApi,
  homepage: homepageApi,
  homepageSections: homepageSectionsApi,
};

// Named exports for direct import
export {
  authApi,
  productsApi,
  ordersApi,
  customerApi,
  adminApi,
  sellerApi,
  designerApi,
  qaApi,
  paymentsApi,
  bannersApi,
  uploadApi,
  homepageApi,
  homepageSectionsApi,
  apiService,
  httpClient,
};

export default api;
