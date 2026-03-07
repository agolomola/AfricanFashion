import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { CheckCircle, Edit2, Filter, Package, Scissors, Search, Star, Upload, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

type ProductType = 'FABRIC' | 'DESIGN' | 'READY_TO_WEAR';
type ModerationAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SUSPEND' | 'PUBLISH' | 'UNPUBLISH';

interface Product {
  id: string;
  type: ProductType;
  name: string;
  description?: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  isAvailable: boolean;
  ownerUserId?: string;
  materialTypeId?: string;
  categoryId?: string;
  basePrice: number;
  finalPrice: number;
  ownerName: string;
  ownerCountry?: string;
  category: string;
  orderCount: number;
  image?: string;
  isFeatured: boolean;
  featuredSections: string[];
  createdAt: string;
}

interface ProductFormState {
  type: ProductType;
  ownerUserId: string;
  name: string;
  description: string;
  status: Product['status'];
  isAvailable: boolean;
  materialTypeId: string;
  categoryId: string;
  basePrice: number;
  finalPrice: number;
  minYards: number;
  stockYards: number;
  images: string[];
  isFeatured: boolean;
}

const EMPTY_FORM: ProductFormState = {
  type: 'FABRIC',
  ownerUserId: '',
  name: '',
  description: '',
  status: 'PENDING_REVIEW',
  isAvailable: false,
  materialTypeId: '',
  categoryId: '',
  basePrice: 0,
  finalPrice: 0,
  minYards: 1,
  stockYards: 0,
  images: [],
  isFeatured: false,
};

const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const fallbackImage = (seed: string, width = 800, height = 600) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;

const handleImageFallback =
  (seed: string, width = 800, height = 600) =>
  (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    const fallback = fallbackImage(seed, width, height);
    if (target.src === fallback) return;
    target.src = fallback;
  };

const isBlobPreviewUrl = (value: string) => String(value || '').startsWith('blob:');

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'fabrics' | 'designs' | 'ready-to-wear'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<ModerationAction>('REQUEST_CHANGES');
  const [submitting, setSubmitting] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [materials, setMaterials] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [sellerUsers, setSellerUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [designerUsers, setDesignerUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);

  const getImageRule = (type: ProductType) => {
    if (type === 'FABRIC') return { min: 3, max: 4 };
    return { min: 4, max: 6 };
  };

  useEffect(() => {
    void fetchProducts();
  }, [activeTab, statusFilter, typeFilter, page, limit, search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, typeFilter]);

  const effectiveType = useMemo(() => {
    if (activeTab === 'fabrics') return 'FABRIC';
    if (activeTab === 'designs') return 'DESIGN';
    if (activeTab === 'ready-to-wear') return 'READY_TO_WEAR';
    return typeFilter || undefined;
  }, [activeTab, typeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getProducts({
        search: search || undefined,
        status: statusFilter || undefined,
        type: effectiveType,
        page,
        limit,
      });
      if (response.success) {
        setProducts(response.data.products);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductFormOptions = async () => {
    try {
      const [materialsRes, categoriesRes, sellerUsersRes, designerUsersRes] = await Promise.all([
        api.admin.getMaterials(),
        api.admin.getCategories(),
        api.admin.getUsers({ role: 'FABRIC_SELLER', limit: 100 }),
        api.admin.getUsers({ role: 'FASHION_DESIGNER', limit: 100 }),
      ]);
      if (materialsRes.success) setMaterials(materialsRes.data || []);
      if (categoriesRes.success) setCategories(categoriesRes.data || []);
      if (sellerUsersRes.success) setSellerUsers(sellerUsersRes.data.users || []);
      if (designerUsersRes.success) setDesignerUsers(designerUsersRes.data.users || []);
    } catch (error) {
      console.error('Failed to load product form options:', error);
    }
  };

  const openCreateProductModal = async () => {
    await loadProductFormOptions();
    setEditingProduct(null);
    setProductForm(EMPTY_FORM);
    setFormError('');
    setShowProductModal(true);
  };

  const openEditProductModal = async (product: Product) => {
    await loadProductFormOptions();
    try {
      setSubmitting(true);
      const details = await api.admin.getProductDetails(product.type, product.id);
      if (details.success) {
        setEditingProduct(product);
        setProductForm({
          type: details.data.type,
          ownerUserId: details.data.ownerUserId || '',
          name: details.data.name || '',
          description: details.data.description || '',
          status: details.data.status || 'PENDING_REVIEW',
          isAvailable: Boolean(details.data.isAvailable),
          materialTypeId: details.data.materialTypeId || '',
          categoryId: details.data.categoryId || '',
          basePrice: Number(details.data.basePrice || 0),
          finalPrice: Number(details.data.finalPrice || 0),
          minYards: Number(details.data.minYards || 1),
          stockYards: Number(details.data.stockYards || 0),
          images: (details.data.images || []).map((img: any) => img.url).filter(Boolean),
          isFeatured: (details.data.featuredSections || []).length > 0,
        });
        setFormError('');
        setShowProductModal(true);
      }
    } catch (error) {
      console.error('Failed to load product details:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProductImage = async (file: File) => {
    let localPreviewUrl = '';
    try {
      setUploadingImage(true);
      setFormError('');
      const imageRule = getImageRule(productForm.type);
      if (productForm.images.length >= imageRule.max) {
        setFormError(`You can upload up to ${imageRule.max} images for this product type.`);
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setFormError(`Unsupported image type (${file.type || 'unknown'}).`);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setFormError(`Image is too large. Max allowed size is ${MAX_UPLOAD_MB}MB.`);
        return;
      }
      localPreviewUrl = URL.createObjectURL(file);
      setProductForm((prev) => ({ ...prev, images: [...prev.images, localPreviewUrl] }));
      const data = new FormData();
      data.append('image', file);
      const response = await api.upload.image(data);
      if (response.success) {
        setProductForm((prev) => {
          const nextImages = prev.images.map((url) =>
            url === localPreviewUrl ? response.data.url : url
          );
          return { ...prev, images: nextImages };
        });
        return;
      }
      if (localPreviewUrl) {
        setProductForm((prev) => ({
          ...prev,
          images: prev.images.filter((url) => url !== localPreviewUrl),
        }));
      }
      setFormError('Image upload failed. Please try another image.');
    } catch (error) {
      console.error('Failed to upload image:', error);
      if (localPreviewUrl) {
        setProductForm((prev) => ({
          ...prev,
          images: prev.images.filter((url) => url !== localPreviewUrl),
        }));
      }
      const message = (error as any)?.response?.data?.message || 'Image upload failed.';
      setFormError(message);
    } finally {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      setUploadingImage(false);
    }
  };

  const saveProduct = async () => {
    try {
      setSavingProduct(true);
      setFormError('');
      const trimmedName = productForm.name.trim();
      const trimmedDescription = productForm.description.trim();
      const basePrice = Number(productForm.basePrice);
      const finalPrice = Number(productForm.finalPrice || productForm.basePrice);
      if (!trimmedName || !trimmedDescription || !productForm.ownerUserId) {
        setFormError('Please fill owner, name, and description.');
        return;
      }
      if (trimmedName.length < 2) {
        setFormError('Product name must be at least 2 characters.');
        return;
      }
      if (trimmedDescription.length < 10) {
        setFormError('Description must be at least 10 characters.');
        return;
      }
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        setFormError('Base price must be greater than 0.');
        return;
      }
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        setFormError('Final price must be greater than 0.');
        return;
      }
      if (productForm.type === 'FABRIC' && !productForm.materialTypeId) {
        setFormError('Please select a material type for fabric.');
        return;
      }
      if (productForm.type !== 'FABRIC' && !productForm.categoryId) {
        setFormError('Please select a category.');
        return;
      }
      const imageRule = getImageRule(productForm.type);
      if (productForm.images.length < imageRule.min || productForm.images.length > imageRule.max) {
        setFormError(
          `Please upload ${imageRule.min}-${imageRule.max} images for ${
            productForm.type === 'FABRIC' ? 'fabric' : 'design/ready-to-wear'
          } products.`
        );
        return;
      }
      if (productForm.images.some((url) => isBlobPreviewUrl(url))) {
        setFormError('Please wait for image upload to complete before saving.');
        return;
      }

      const payload = {
        type: productForm.type,
        ownerUserId: productForm.ownerUserId,
        name: trimmedName,
        description: trimmedDescription,
        status: productForm.status,
        isAvailable: productForm.isAvailable,
        materialTypeId: productForm.type === 'FABRIC' ? productForm.materialTypeId : undefined,
        categoryId: productForm.type !== 'FABRIC' ? productForm.categoryId : undefined,
        basePrice,
        finalPrice,
        minYards: productForm.type === 'FABRIC' ? Number(productForm.minYards || 1) : undefined,
        stockYards: productForm.type === 'FABRIC' ? Number(productForm.stockYards || 0) : undefined,
        images: productForm.images,
      };

      let productId = editingProduct?.id;
      if (editingProduct) {
        await api.admin.updateProduct(editingProduct.type, editingProduct.id, payload);
      } else {
        const created = await api.admin.createProduct(payload);
        productId = created?.data?.id;
      }

      let featuredWarning = '';
      if (productId) {
        try {
          await api.admin.setProductFeatured(productForm.type, productId, {
            isFeatured: productForm.isFeatured,
          });
        } catch (error: any) {
          featuredWarning = error?.response?.data?.message || 'Featured toggle update failed.';
        }
      }

      setShowProductModal(false);
      await fetchProducts();
      if (featuredWarning) {
        window.alert(`Product saved, but featured toggle failed: ${featuredWarning}`);
      }
    } catch (error: any) {
      const firstIssue = error?.response?.data?.errors?.[0];
      const issuePath = Array.isArray(firstIssue?.path) ? firstIssue.path.join('.') : '';
      const issueMessage = firstIssue?.message
        ? `${issuePath ? `${issuePath}: ` : ''}${firstIssue.message}`
        : '';
      setFormError(issueMessage || error?.response?.data?.message || 'Failed to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const moderateProduct = async (product: Product, action: ModerationAction) => {
    try {
      setSubmitting(true);
      const requiresMessage = action === 'REQUEST_CHANGES' || action === 'REJECT' || action === 'SUSPEND';
      let message: string | undefined;
      if (requiresMessage) {
        message = window.prompt('Enter message to vendor (required):', '')?.trim() || undefined;
        if (!message) {
          setSubmitting(false);
          return;
        }
      }
      await api.admin.moderateProduct(product.type, product.id, {
        action,
        message,
        notifyVendor: true,
      });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to moderate product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;
    try {
      setSubmitting(true);
      const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
      const byType = selectedProducts.reduce<Record<ProductType, string[]>>(
        (acc, product) => {
          acc[product.type].push(product.id);
          return acc;
        },
        { FABRIC: [], DESIGN: [], READY_TO_WEAR: [] }
      );
      const message =
        bulkAction === 'REQUEST_CHANGES' || bulkAction === 'REJECT' || bulkAction === 'SUSPEND'
          ? window.prompt('Enter message to affected vendors:', '')?.trim() || undefined
          : undefined;
      if ((bulkAction === 'REQUEST_CHANGES' || bulkAction === 'REJECT' || bulkAction === 'SUSPEND') && !message) {
        setSubmitting(false);
        return;
      }
      await Promise.all(
        (Object.entries(byType) as [ProductType, string[]][])
          .filter(([, ids]) => ids.length > 0)
          .map(([productType, productIds]) =>
            api.admin.moderateProductsBulk({
              productType,
              productIds,
              action: bulkAction,
              message,
              notifyVendor: true,
            })
          )
      );
      await fetchProducts();
    } catch (error) {
      console.error('Failed to run bulk moderation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (product: Product) => {
    if (product.status === 'APPROVED' && !product.isAvailable) return 'UNPUBLISHED';
    return product.status;
  };

  const statusVariant = (product: Product) => {
    if (product.status === 'APPROVED' && !product.isAvailable) return 'gray';
    if (product.status === 'APPROVED') return 'green';
    if (product.status === 'PENDING_REVIEW') return 'yellow';
    if (product.status === 'REJECTED') return 'red';
    if (product.status === 'ARCHIVED') return 'gray';
    return 'secondary';
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
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Total products: {pagination.total}</div>
          <Button onClick={openCreateProductModal}>
            Add Product
          </Button>
        </div>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
          <option value="DRAFT">Draft</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <span className="text-sm font-medium text-amber-900">{selectedIds.length} selected</span>
        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value as ModerationAction)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="REQUEST_CHANGES">Request changes</option>
          <option value="APPROVE">Approve + Publish</option>
          <option value="REJECT">Reject</option>
          <option value="SUSPEND">Suspend</option>
          <option value="UNPUBLISH">Unpublish</option>
          <option value="PUBLISH">Publish</option>
        </select>
        <Button onClick={handleBulkAction} disabled={selectedIds.length === 0 || submitting}>
          Apply to selected
        </Button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? products.map((product) => product.id) : [])
                    }
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Featured</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Seller/Designer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Orders</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, product.id]
                            : prev.filter((selectedId) => selectedId !== product.id)
                        )
                      }
                    />
                  </td>
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
                  <td className="py-3 px-4 font-medium">${Number(product.finalPrice || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    {product.isFeatured ? (
                      <Badge variant="yellow">
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          Featured
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="gray">No</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={statusVariant(product)}>
                      {statusLabel(product)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <div>{product.ownerName}</div>
                    <div className="text-xs text-gray-400">{product.ownerCountry || '-'}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{product.orderCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditProductModal(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Product details"
                        disabled={submitting}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, 'APPROVE')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Approve and publish"
                        disabled={submitting}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, 'REQUEST_CHANGES')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Request corrections"
                        disabled={submitting}
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, 'REJECT')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Reject product"
                        disabled={submitting}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moderateProduct(product, product.isAvailable ? 'UNPUBLISH' : 'PUBLISH')}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50"
                        disabled={submitting}
                      >
                        {product.isAvailable ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {Math.max(1, pagination.pages)} • {pagination.total} products
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

      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold">{editingProduct ? 'Product Details / Edit' : 'Add Product'}</h3>
            {formError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <select
                value={productForm.type}
                disabled={Boolean(editingProduct)}
                onChange={(e) => setProductForm({ ...productForm, type: e.target.value as ProductType })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="FABRIC">Fabric</option>
                <option value="DESIGN">Design</option>
                <option value="READY_TO_WEAR">Ready To Wear</option>
              </select>
              <select
                value={productForm.ownerUserId}
                onChange={(e) => setProductForm({ ...productForm, ownerUserId: e.target.value })}
                className="px-3 py-2 border rounded-lg"
                disabled={Boolean(editingProduct)}
              >
                <option value="">Select Owner</option>
                {(productForm.type === 'FABRIC' ? sellerUsers : designerUsers).map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Product name"
                className="px-3 py-2 border rounded-lg"
              />
              <div className="px-3 py-2 border rounded-lg text-sm text-gray-600 flex items-center">
                Images: {productForm.images.length} selected (required {getImageRule(productForm.type).min}-{getImageRule(productForm.type).max})
              </div>
            </div>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              placeholder="Description"
              className="w-full px-3 py-2 border rounded-lg h-24"
            />

            <div className="flex items-center gap-3">
              <label className="px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProductImage(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <span className="text-xs text-gray-500">
                {`Required: ${getImageRule(productForm.type).min}-${getImageRule(productForm.type).max} images • Max ${MAX_UPLOAD_MB}MB each`}
              </span>
            </div>
            {productForm.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {productForm.images.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      onError={handleImageFallback(`admin-product-${productForm.name || index}`, 640, 480)}
                      className="h-16 w-full object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (isBlobPreviewUrl(url)) {
                          URL.revokeObjectURL(url);
                        }
                        setProductForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, idx) => idx !== index),
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-white rounded-full shadow p-0.5 text-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {productForm.type === 'FABRIC' ? (
                <select
                  value={productForm.materialTypeId}
                  onChange={(e) => setProductForm({ ...productForm, materialTypeId: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Material Type</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>{material.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              )}
              <select
                value={productForm.status}
                onChange={(e) => setProductForm({ ...productForm, status: e.target.value as Product['status'] })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={productForm.basePrice}
                  onChange={(e) => setProductForm({ ...productForm, basePrice: Number(e.target.value) })}
                  placeholder="e.g. 45.00"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Vendor base price before admin pricing rules.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Price (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={productForm.finalPrice}
                  onChange={(e) => setProductForm({ ...productForm, finalPrice: Number(e.target.value) })}
                  placeholder="e.g. 54.00"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Optional override; otherwise computed from base price.</p>
              </div>
            </div>

            {productForm.type === 'FABRIC' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Quantity (yards)</label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={productForm.minYards}
                    onChange={(e) => setProductForm({ ...productForm, minYards: Number(e.target.value) })}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Smallest quantity a customer can order.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Stock (yards)</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={productForm.stockYards}
                    onChange={(e) => setProductForm({ ...productForm, stockYards: Number(e.target.value) })}
                    placeholder="e.g. 120"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current inventory available for sale.</p>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Admin-only product controls</p>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={productForm.isAvailable}
                  onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                />
                Publish product
              </label>
              <label className="inline-flex items-center gap-2 text-sm ml-4">
                <input
                  type="checkbox"
                  checked={productForm.isFeatured}
                  onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                />
                <span className="inline-flex items-center gap-1">
                  <Star className={`w-4 h-4 ${productForm.isFeatured ? 'text-amber-500 fill-current' : 'text-gray-400'}`} />
                  Mark as featured
                </span>
              </label>
              {productForm.isFeatured && (
                <p className="text-xs text-gray-500">
                  Featured section is assigned automatically by product type:
                  {' '}
                  {productForm.type === 'FABRIC'
                    ? 'Featured Fabrics'
                    : productForm.type === 'READY_TO_WEAR'
                      ? 'Featured Ready To Wear'
                      : 'Featured Designs'}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowProductModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveProduct} disabled={savingProduct || uploadingImage}>
                {savingProduct ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
