import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Globe, Sparkles, ShoppingBag, User, BookOpen, MessageSquare, Layout, Loader2, Cog, Star } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/ToastProvider';

type SectionType = 'countries' | 'howItWorks' | 'categories' | 'designerSpotlight' | 'heritage' | 'testimonials' | 'footer';

interface Country {
  id: string;
  name: string;
  countryCode?: string;
  flag: string;
  image: string;
  keywords?: string;
  fabrics: string;
  displayOrder: number;
  isActive: boolean;
}

interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

interface CountryImageApiConfig {
  provider: 'OPENAI' | 'OPENAI_COMPATIBLE' | 'POLLINATIONS';
  endpoint: string;
  model: string;
  imageSize: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  source: 'DATABASE' | 'ENV_DEFAULT';
}

interface HowItWorksStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  icon: string;
  isActive: boolean;
}

interface ShopCategory {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  displayOrder: number;
  isActive: boolean;
}

interface DesignerSpotlight {
  id: string;
  designerId: string;
  headline: string;
  description: string;
  quote: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
  designer?: {
    businessName: string;
    country: string;
  };
}

interface DesignerOption {
  id: string;
  businessName: string;
  country: string;
  isVerified: boolean;
}

interface HeritageSection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  stats: { label: string; value: string }[];
  displayOrder: number;
  isActive: boolean;
}

interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating: number;
  text: string;
  displayOrder: number;
  isActive: boolean;
}

interface FooterContent {
  id: string;
  column: string;
  title: string;
  links: { label: string; url: string }[];
  displayOrder: number;
  isActive: boolean;
}

const MAX_UPLOAD_SIZE_MB = 10;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const TABS = [
  { id: 'countries' as SectionType, label: 'Countries', icon: Globe },
  { id: 'howItWorks' as SectionType, label: 'How It Works', icon: Sparkles },
  { id: 'categories' as SectionType, label: 'Categories', icon: ShoppingBag },
  { id: 'designerSpotlight' as SectionType, label: 'Designer Spotlight', icon: User },
  { id: 'heritage' as SectionType, label: 'Heritage', icon: BookOpen },
  { id: 'testimonials' as SectionType, label: 'Testimonials', icon: MessageSquare },
  { id: 'footer' as SectionType, label: 'Footer', icon: Layout },
];

export default function HomepageSections() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SectionType>('countries');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [howItWorks, setHowItWorks] = useState<HowItWorksStep[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [designerSpotlights, setDesignerSpotlights] = useState<DesignerSpotlight[]>([]);
  const [heritageSections, setHeritageSections] = useState<HeritageSection[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [footerContents, setFooterContents] = useState<FooterContent[]>([]);
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [showCountryImageApiModal, setShowCountryImageApiModal] = useState(false);
  const [countryImageApiConfig, setCountryImageApiConfig] = useState<CountryImageApiConfig | null>(null);
  const [countryImageApiLoading, setCountryImageApiLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const loadAdminDependencies = async () => {
      try {
        const [designerResponse, countryOptionsResponse] = await Promise.all([
          api.homepageSections.getAdminDesigners(),
          api.homepageSections.getAdminCountryOptions(),
        ]);
        if (designerResponse.success) {
          setDesigners(designerResponse.data || []);
        }
        if (countryOptionsResponse.success) {
          setCountryOptions(countryOptionsResponse.data || []);
        }
      } catch (error) {
        console.error('Error fetching homepage section dependencies:', error);
        toast.error('Failed to load homepage section options.');
      }
    };

    loadAdminDependencies();
  }, [toast]);

  useEffect(() => {
    if (activeTab !== 'countries') return;
    fetchCountryImageApiConfig();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'countries':
          const countriesRes = await api.homepageSections.getAdminCountries();
          if (countriesRes.success) setCountries(countriesRes.data);
          break;
        case 'howItWorks':
          const howItWorksRes = await api.homepageSections.getAdminHowItWorks();
          if (howItWorksRes.success) setHowItWorks(howItWorksRes.data);
          break;
        case 'categories':
          const categoriesRes = await api.homepageSections.getAdminCategories();
          if (categoriesRes.success) setCategories(categoriesRes.data);
          break;
        case 'designerSpotlight':
          const spotlightRes = await api.homepageSections.getAdminDesignerSpotlights();
          if (spotlightRes.success) setDesignerSpotlights(spotlightRes.data);
          break;
        case 'heritage':
          const heritageRes = await api.homepageSections.getAdminHeritage();
          if (heritageRes.success) setHeritageSections(heritageRes.data);
          break;
        case 'testimonials':
          const testimonialsRes = await api.homepageSections.getAdminTestimonials();
          if (testimonialsRes.success) setTestimonials(testimonialsRes.data);
          break;
        case 'footer':
          const footerRes = await api.homepageSections.getAdminFooter();
          if (footerRes.success && footerRes.data) setFooterContents([footerRes.data]);
          else setFooterContents([]);
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      let response;
      switch (activeTab) {
        case 'countries':
          const country = countries.find(c => c.id === id);
          if (country) {
            response = await api.homepageSections.updateCountry(id, { ...country, isActive: !currentStatus });
            if (response.success) {
              fetchData();
              toast.success(currentStatus ? 'Country hidden.' : 'Country activated.');
            }
          }
          break;
        case 'howItWorks':
          const step = howItWorks.find(s => s.id === id);
          if (step) {
            response = await api.homepageSections.updateHowItWorksStep(id, { ...step, isActive: !currentStatus });
            if (response.success) {
              fetchData();
              toast.success(currentStatus ? 'How-it-works step hidden.' : 'How-it-works step activated.');
            }
          }
          break;
        case 'categories':
          const cat = categories.find(c => c.id === id);
          if (cat) {
            response = await api.homepageSections.updateCategory(id, { ...cat, isActive: !currentStatus });
            if (response.success) {
              fetchData();
              toast.success(currentStatus ? 'Category hidden.' : 'Category activated.');
            }
          }
          break;
        case 'designerSpotlight':
          const spotlight = designerSpotlights.find(s => s.id === id);
          if (spotlight) {
            response = await api.homepageSections.updateDesignerSpotlight(id, { ...spotlight, isActive: !currentStatus });
            if (response.success) {
              fetchData();
              toast.success(currentStatus ? 'Designer spotlight hidden.' : 'Designer spotlight activated.');
            }
          }
          break;
        case 'heritage':
          const heritage = heritageSections.find(h => h.id === id);
          if (heritage) {
            response = await api.homepageSections.updateHeritage(id, { ...heritage, isActive: !currentStatus });
            if (response.success) {
              fetchData();
              toast.success(currentStatus ? 'Heritage section hidden.' : 'Heritage section activated.');
            }
          }
          break;
        case 'testimonials':
          const testimonial = testimonials.find(t => t.id === id);
          if (testimonial) {
            response = await api.homepageSections.updateTestimonial(id, { ...testimonial, isActive: !currentStatus });
            if (response.success) {
              fetchData();
              toast.success(currentStatus ? 'Testimonial hidden.' : 'Testimonial activated.');
            }
          }
          break;
      }
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error?.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      let response;
      switch (activeTab) {
        case 'countries':
          response = await api.homepageSections.deleteCountry(id);
          break;
        case 'howItWorks':
          response = await api.homepageSections.deleteHowItWorksStep(id);
          break;
        case 'categories':
          response = await api.homepageSections.deleteCategory(id);
          break;
        case 'designerSpotlight':
          response = await api.homepageSections.deleteDesignerSpotlight(id);
          break;
        case 'heritage':
          response = await api.homepageSections.deleteHeritage(id);
          break;
        case 'testimonials':
          response = await api.homepageSections.deleteTestimonial(id);
          break;
      }
      if (response?.success) {
        fetchData();
        toast.success('Item deleted successfully.');
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete item.');
    }
  };

  const openModal = (item: any = null) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingItem(null);
    setShowModal(false);
  };

  const handleSave = () => {
    fetchData();
    closeModal();
  };

  const fetchCountryImageApiConfig = async () => {
    setCountryImageApiLoading(true);
    try {
      const response = await api.homepageSections.getCountryImageApiConfig();
      if (response.success) {
        setCountryImageApiConfig(response.data);
      }
    } catch (error) {
      console.error('Error loading country image API config:', error);
      toast.error('Failed to load country image API configuration.');
    } finally {
      setCountryImageApiLoading(false);
    }
  };

  const openCountryImageApiModal = async () => {
    setShowCountryImageApiModal(true);
    await fetchCountryImageApiConfig();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Sections</h1>
          <p className="text-gray-500 mt-1">Manage all dynamic homepage content</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'countries' && (
            <Button variant="secondary" onClick={openCountryImageApiModal} className="flex items-center gap-2">
              <Cog className="w-4 h-4" />
              Country Image API
            </Button>
          )}
          <Button onClick={() => openModal()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <>
            {activeTab === 'countries' && (
              <CountriesTable
                data={countries}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'howItWorks' && (
              <HowItWorksTable
                data={howItWorks}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'categories' && (
              <CategoriesTable
                data={categories}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'designerSpotlight' && (
              <DesignerSpotlightTable
                data={designerSpotlights}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'heritage' && (
              <HeritageTable
                data={heritageSections}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'testimonials' && (
              <TestimonialsTable
                data={testimonials}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'footer' && (
              <FooterTable
                data={footerContents}
                onEdit={openModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <SectionModal
          type={activeTab}
          item={editingItem}
          designers={designers}
          countryOptions={countryOptions}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {showCountryImageApiModal && (
        <CountryImageApiSettingsModal
          loading={countryImageApiLoading}
          config={countryImageApiConfig}
          onClose={() => setShowCountryImageApiModal(false)}
          onSaved={async () => {
            await fetchCountryImageApiConfig();
          }}
        />
      )}
    </div>
  );
}

function CountryImageApiSettingsModal({
  loading,
  config,
  onClose,
  onSaved,
}: {
  loading: boolean;
  config: CountryImageApiConfig | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [formError, setFormError] = useState('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    previewUrl?: string;
    provider?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    provider: 'POLLINATIONS' as CountryImageApiConfig['provider'],
    endpoint: '',
    model: '',
    imageSize: '',
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);

  useEffect(() => {
    if (!config) return;
    setFormData({
      provider: config.provider,
      endpoint: config.endpoint || '',
      model: config.model || '',
      imageSize: config.imageSize || '',
    });
    setApiKeyInput('');
    setClearApiKey(false);
    setFormError('');
    setTestResult(null);
  }, [config]);

  const buildPayload = () => ({
    provider: formData.provider,
    endpoint: formData.endpoint.trim() || undefined,
    model: formData.model.trim() || undefined,
    imageSize: formData.imageSize.trim() || undefined,
    ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
    ...(clearApiKey ? { clearApiKey: true } : {}),
    ...(!apiKeyInput.trim() && !clearApiKey ? { useStoredApiKey: true } : {}),
  });

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setFormError('');
    setTestResult(null);
    try {
      const response = await api.homepageSections.testCountryImageApiConfig({
        ...buildPayload(),
        countryCode: 'NG',
        name: 'Nigeria',
        keywords: 'editorial, modern, handcrafted textiles',
      });
      if (response.success) {
        const message = response.message || 'Connection test succeeded.';
        setTestResult({
          success: true,
          message,
          previewUrl: response.data.url,
          provider: response.data.provider,
        });
        toast.success(message);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Connection test failed.';
      setFormError(message);
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const response = await api.homepageSections.updateCountryImageApiConfig(buildPayload());
      if (response.success) {
        await onSaved();
        if (response.warning === 'MISSING_API_KEY') {
          toast.error(response.message || 'Configuration saved, but API key is missing.');
        } else {
          toast.success('Country image API settings saved.');
        }
        onClose();
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save image API settings.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Country Image API Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
              {testResult && (
                <div
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    testResult.success
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.success && testResult.provider && (
                    <p className="text-xs mt-1">Provider: {testResult.provider}</p>
                  )}
                  {testResult.success && testResult.previewUrl && (
                    <img
                      src={testResult.previewUrl}
                      alt="Connection test preview"
                      className="mt-2 h-24 w-40 object-cover rounded border border-gray-200"
                    />
                  )}
                </div>
              )}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                Source: <span className="font-semibold">{config?.source === 'DATABASE' ? 'Admin dashboard config' : 'Environment defaults'}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, provider: e.target.value as CountryImageApiConfig['provider'] }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="POLLINATIONS">Pollinations (no API key)</option>
                  <option value="OPENAI">OpenAI</option>
                  <option value="OPENAI_COMPATIBLE">OpenAI-Compatible API</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  value={formData.endpoint}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="https://api.openai.com/v1/images/generations"
                  disabled={formData.provider === 'POLLINATIONS'}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="gpt-image-1"
                    disabled={formData.provider === 'POLLINATIONS'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image Size</label>
                  <input
                    type="text"
                    value={formData.imageSize}
                    onChange={(e) => setFormData((prev) => ({ ...prev, imageSize: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="1536x1024"
                    disabled={formData.provider === 'POLLINATIONS'}
                  />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                <div className="text-sm text-gray-700">
                  Current API key: {config?.hasApiKey ? <span className="font-mono">{config.maskedApiKey}</span> : <span className="text-gray-500">Not set</span>}
                </div>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter new API key to replace current key"
                  disabled={formData.provider === 'POLLINATIONS'}
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={clearApiKey}
                    onChange={(e) => setClearApiKey(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    disabled={formData.provider === 'POLLINATIONS'}
                  />
                  Clear stored API key
                </label>
              </div>
              <p className="text-xs text-gray-500">
                These settings are saved in the admin system and used by country image generation immediately.
              </p>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={loading || saving || testingConnection}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button type="submit" disabled={loading || saving || testingConnection}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Table Components
function CountriesTable({ data, onEdit, onToggle, onDelete }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flag</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fabrics</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: Country) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.displayOrder}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-10 w-10 object-cover mr-3" />
                )}
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.countryCode || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-2xl">{item.flag}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.fabrics}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => onToggle(item.id, item.isActive)} className="text-gray-400 hover:text-gray-600">
                  {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HowItWorksTable({ data, onEdit, onToggle, onDelete }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: HowItWorksStep) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.stepNumber}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.description}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => onToggle(item.id, item.isActive)} className="text-gray-400 hover:text-gray-600">
                  {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CategoriesTable({ data, onEdit, onToggle, onDelete }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtitle</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: ShopCategory) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.displayOrder}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                {item.image && (
                  <img src={item.image} alt={item.title} className="h-10 w-10 object-cover mr-3" />
                )}
                <span className="text-sm font-medium text-gray-900">{item.title}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subtitle}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.link}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => onToggle(item.id, item.isActive)} className="text-gray-400 hover:text-gray-600">
                  {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DesignerSpotlightTable({ data, onEdit, onToggle, onDelete }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designer</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headline</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: DesignerSpotlight) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                {item.image && (
                  <img src={item.image} alt={item.designer?.businessName} className="h-10 w-10 object-cover mr-3" />
                )}
                <span className="text-sm font-medium text-gray-900">{item.designer?.businessName || 'Unknown'}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.headline}</td>
            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.description}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => onToggle(item.id, item.isActive)} className="text-gray-400 hover:text-gray-600">
                  {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HeritageTable({ data, onEdit, onToggle, onDelete }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtitle</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: HeritageSection) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.displayOrder}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                {item.image && (
                  <img src={item.image} alt={item.title} className="h-10 w-10 object-cover mr-3" />
                )}
                <span className="text-sm font-medium text-gray-900">{item.title}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subtitle}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => onToggle(item.id, item.isActive)} className="text-gray-400 hover:text-gray-600">
                  {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TestimonialsTable({ data, onEdit, onToggle, onDelete }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: Testimonial) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.displayOrder}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                {item.avatar && (
                  <img src={item.avatar} alt={item.name} className="h-10 w-10 object-cover mr-3" />
                )}
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => onToggle(item.id, item.isActive)} className="text-gray-400 hover:text-gray-600">
                  {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FooterTable({ data, onEdit }: any) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item: FooterContent) => (
          <tr key={item.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.column}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
            <td className="px-6 py-4 text-sm text-gray-500">
              {item.links?.length || 0} links
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-900">
                <Edit2 className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Modal Component
function SectionModal({
  type,
  item,
  designers,
  countryOptions,
  onClose,
  onSave,
}: {
  type: SectionType;
  item: any;
  designers: DesignerOption[];
  countryOptions: CountryOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const toast = useToast();
  const [formData, setFormData] = useState<any>(() => ({ ...getDefaultFormData(type), ...(item || {}) }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingCountryImage, setGeneratingCountryImage] = useState(false);
  const [formError, setFormError] = useState('');
  const uploadField = type === 'testimonials' ? 'avatar' : 'image';

  function getDefaultFormData(sectionType: SectionType) {
    switch (sectionType) {
      case 'countries':
        return {
          name: '',
          countryCode: '',
          flag: '',
          image: '',
          keywords: '',
          fabrics: '',
          useGeneratedImage: true,
          displayOrder: 0,
          isActive: true,
        };
      case 'howItWorks':
        return { stepNumber: 1, title: '', description: '', icon: 'Sparkles', isActive: true };
      case 'categories':
        return { title: '', subtitle: '', image: '', link: '', displayOrder: 0, isActive: true };
      case 'designerSpotlight':
        return { designerId: '', headline: '', description: '', quote: '', image: '', displayOrder: 0, isActive: true };
      case 'heritage':
        return { title: '', subtitle: '', description: '', image: '', stats: [], displayOrder: 0, isActive: true };
      case 'testimonials':
        return { name: '', location: '', avatar: '', rating: 5, text: '', displayOrder: 0, isActive: true };
      case 'footer':
        return { column: '', title: '', links: [], isActive: true };
      default:
        return {};
    }
  }

  const countryOptionByCode = new Map(countryOptions.map((option) => [option.code, option]));
  const countryOptionByName = new Map(countryOptions.map((option) => [option.name.toLowerCase(), option]));

  useEffect(() => {
    setFormData((prev: any) => {
      if (type !== 'countries') {
        return prev;
      }
      const optionFromCode = prev?.countryCode ? countryOptionByCode.get(String(prev.countryCode).toUpperCase()) : undefined;
      const optionFromName = prev?.name ? countryOptionByName.get(String(prev.name).toLowerCase()) : undefined;
      const option = optionFromCode || optionFromName;

      return {
        ...prev,
        name: option?.name || prev?.name || '',
        countryCode: option?.code || prev?.countryCode || '',
        flag: option?.flag || prev?.flag || '',
        keywords: prev?.keywords || '',
        useGeneratedImage:
          typeof prev?.useGeneratedImage === 'boolean'
            ? prev.useGeneratedImage
            : Boolean(prev?.keywords || /source\.unsplash\.com/i.test(String(prev?.image || ''))),
      };
    });
  }, [type, countryOptions]);

  const handleCountryCodeChange = (countryCode: string) => {
    const option = countryOptionByCode.get(countryCode);
    setFormData((prev: any) => ({
      ...prev,
      countryCode: option?.code || countryCode,
      name: option?.name || prev.name,
      flag: option?.flag || prev.flag,
      image: prev.useGeneratedImage ? '' : prev.image,
    }));
  };

  const handleGenerateCountryImagePreview = async () => {
    if (type !== 'countries') return;
    setFormError('');
    const countryName = String(formData.name || '').trim();
    const countryCode = String(formData.countryCode || '').trim().toUpperCase();
    if (!countryName || !countryCode) {
      const message = 'Select a country code before generating image.';
      setFormError(message);
      toast.error(message);
      return;
    }
    const keywords = String(formData.keywords || '').trim();
    if (!keywords) {
      const message = 'Enter at least one keyword to generate a country image.';
      setFormError(message);
      toast.error(message);
      return;
    }
    setGeneratingCountryImage(true);
    try {
      const response = await api.homepageSections.generateCountryImage({
        countryCode,
        name: countryName,
        keywords,
      });
      if (response.success) {
        setFormData((prev: any) => ({
          ...prev,
          image: response.data.url,
          useGeneratedImage: true,
        }));
        toast.success(
          response.data.fallbackUsed
            ? `Generated via fallback provider (${response.data.provider}).`
            : `Image generated via ${response.data.provider}.`
        );
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to generate image preview.';
      setFormError(message);
      toast.error(message);
    } finally {
      setGeneratingCountryImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      const message = `Unsupported image type "${file.type || 'unknown'}". Use JPG, PNG, WEBP, AVIF, HEIC, or HEIF.`;
      setFormError(message);
      toast.error(message);
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      const message = `"${file.name}" is too large. Max allowed image size is ${MAX_UPLOAD_SIZE_MB}MB.`;
      setFormError(message);
      toast.error(message);
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      const response = await api.upload.image(uploadFormData);
      if (response.success) {
        setFormData((prev: any) => ({ ...prev, [field]: response.data.url }));
        toast.success('Image uploaded successfully.');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const message = error?.response?.data?.message || error?.message || 'Image upload failed.';
      setFormError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    if (type === 'countries') {
      if (!String(formData.countryCode || '').trim()) {
        setSaving(false);
        setFormError('Please select an African country code.');
        toast.error('Please select an African country code.');
        return;
      }
      if (formData.useGeneratedImage && !String(formData.keywords || '').trim()) {
        setSaving(false);
        setFormError('Add keywords to generate a country image.');
        toast.error('Add keywords to generate a country image.');
        return;
      }
      if (!formData.useGeneratedImage && !String(formData.image || '').trim()) {
        setSaving(false);
        setFormError('Please upload an image or enable generated image mode.');
        toast.error('Please upload an image or enable generated image mode.');
        return;
      }
    }

    if (['categories', 'designerSpotlight', 'heritage'].includes(type) && !formData.image) {
      setSaving(false);
      setFormError('Please upload an image before submitting.');
      toast.error('Please upload an image before submitting.');
      return;
    }
    try {
      let response;
      const payload =
        type === 'countries'
          ? (() => {
              const { useGeneratedImage, ...rest } = formData;
              const countryCode = String(rest.countryCode || '').trim().toUpperCase();
              const option = countryOptionByCode.get(countryCode);
              const countryName = String(option?.name || rest.name || '').trim();
              const keywords = String(rest.keywords || '').trim();
              return {
                ...rest,
                countryCode,
                name: countryName,
                flag: option?.flag || rest.flag,
                image: rest.image,
                keywords,
                generateImage: Boolean(useGeneratedImage),
              };
            })()
          : formData;
      if (item?.id) {
        // Update existing
        switch (type) {
          case 'countries':
            response = await api.homepageSections.updateCountry(item.id, payload);
            break;
          case 'howItWorks':
            response = await api.homepageSections.updateHowItWorksStep(item.id, payload);
            break;
          case 'categories':
            response = await api.homepageSections.updateCategory(item.id, payload);
            break;
          case 'designerSpotlight':
            response = await api.homepageSections.updateDesignerSpotlight(item.id, payload);
            break;
          case 'heritage':
            response = await api.homepageSections.updateHeritage(item.id, payload);
            break;
          case 'testimonials':
            response = await api.homepageSections.updateTestimonial(item.id, payload);
            break;
          case 'footer':
            response = await api.homepageSections.updateFooter(item.id, payload);
            break;
        }
      } else {
        // Create new
        switch (type) {
          case 'countries':
            response = await api.homepageSections.createCountry(payload);
            break;
          case 'howItWorks':
            response = await api.homepageSections.createHowItWorksStep(payload);
            break;
          case 'categories':
            response = await api.homepageSections.createCategory(payload);
            break;
          case 'designerSpotlight':
            response = await api.homepageSections.createDesignerSpotlight(payload);
            break;
          case 'heritage':
            response = await api.homepageSections.createHeritage(payload);
            break;
          case 'testimonials':
            response = await api.homepageSections.createTestimonial(payload);
            break;
          case 'footer':
            response = await api.homepageSections.createFooter(payload);
            break;
        }
      }
      if (response?.success) {
        toast.success(item?.id ? 'Section updated successfully.' : 'Section created successfully.');
        onSave();
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      const message = error?.response?.data?.message || 'Failed to save changes.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => {
    switch (type) {
      case 'countries':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
              <select
                value={formData.countryCode || ''}
                onChange={(e) => handleCountryCodeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                <option value="">Select African country code</option>
                {countryOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.flag} {option.name} ({option.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flag</label>
                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-2xl leading-none">
                  {formData.flag || '🌍'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fabrics</label>
              <input
                type="text"
                value={formData.fabrics || ''}
                onChange={(e) => setFormData({ ...formData, fabrics: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Kente, Adinkra"
                required
              />
            </div>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(formData.useGeneratedImage)}
                  onChange={(e) => setFormData({ ...formData, useGeneratedImage: e.target.checked })}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                Generate image from keywords
              </label>
              <p className="text-xs text-gray-500">
                Add comma-separated keywords (e.g. wax print, runway, handcrafted). The generated image URL will be saved with this country post.
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  value={formData.keywords || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      keywords: e.target.value,
                      image: formData.useGeneratedImage ? '' : formData.image,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="ankara, street style, heritage textiles"
                  required={Boolean(formData.useGeneratedImage)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerateCountryImagePreview}
                  disabled={!formData.useGeneratedImage || generatingCountryImage}
                >
                  {generatingCountryImage ? 'Generating...' : 'Generate Preview'}
                </Button>
              </div>
            </div>
          </>
        );
      case 'howItWorks':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Number</label>
              <input
                type="number"
                value={formData.stepNumber || 1}
                onChange={(e) => setFormData({ ...formData, stepNumber: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={3}
                required
              />
            </div>
          </>
        );
      case 'categories':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
              <input
                type="text"
                value={formData.link || ''}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="/designs"
                required
              />
            </div>
          </>
        );
      case 'designerSpotlight':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designer</label>
              <select
                value={formData.designerId || ''}
                onChange={(e) => setFormData({ ...formData, designerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                <option value="">Select designer</option>
                {designers.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.businessName} ({designer.country})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
              <input
                type="text"
                value={formData.headline || ''}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quote</label>
              <textarea
                value={formData.quote || ''}
                onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={2}
              />
            </div>
          </>
        );
      case 'heritage':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={4}
              />
            </div>
          </>
        );
      case 'testimonials':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="New York, USA"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
              <input
                type="number"
                value={formData.rating || 5}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min={1}
                max={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Testimonial Text</label>
              <textarea
                value={formData.text || ''}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={4}
                required
              />
            </div>
          </>
        );
      case 'footer':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
              <input
                type="text"
                value={formData.column || ''}
                onChange={(e) => setFormData({ ...formData, column: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="column1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {item ? 'Edit' : 'Add'} {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          {renderFormFields()}

          {/* Image Upload */}
          {(type === 'countries' || type === 'categories' || type === 'designerSpotlight' || type === 'heritage' || type === 'testimonials') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'testimonials' ? 'Avatar' : 'Image'}</label>
              <div className="flex items-center gap-4">
                {formData[uploadField] && (
                  <img src={formData[uploadField]} alt="Preview" className="h-20 w-20 object-cover" />
                )}
                {(type !== 'countries' || !formData.useGeneratedImage) && (
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, uploadField)}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              {type === 'countries' && formData.useGeneratedImage && (
                <p className="mt-2 text-xs text-gray-500">
                  Image is generated from country + keywords. Manual upload is disabled while generated mode is on.
                </p>
              )}
            </div>
          )}

          {/* Display Order */}
          {type !== 'footer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder || 0}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min={0}
              />
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading || generatingCountryImage}>
              {saving ? 'Saving...' : item ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
