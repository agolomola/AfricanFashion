import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Globe, Sparkles, ShoppingBag, User, BookOpen, MessageSquare, Layout, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

type SectionType = 'countries' | 'howItWorks' | 'categories' | 'designerSpotlight' | 'heritage' | 'testimonials' | 'footer';

interface Country {
  id: string;
  name: string;
  flag: string;
  image: string;
  fabrics: string;
  displayOrder: number;
  isActive: boolean;
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

  useEffect(() => {
    fetchData();
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
          if (footerRes.success) setFooterContents([footerRes.data]);
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
            if (response.success) fetchData();
          }
          break;
        case 'howItWorks':
          const step = howItWorks.find(s => s.id === id);
          if (step) {
            response = await api.homepageSections.updateHowItWorksStep(id, { ...step, isActive: !currentStatus });
            if (response.success) fetchData();
          }
          break;
        case 'categories':
          const cat = categories.find(c => c.id === id);
          if (cat) {
            response = await api.homepageSections.updateCategory(id, { ...cat, isActive: !currentStatus });
            if (response.success) fetchData();
          }
          break;
        case 'designerSpotlight':
          const spotlight = designerSpotlights.find(s => s.id === id);
          if (spotlight) {
            response = await api.homepageSections.updateDesignerSpotlight(id, { ...spotlight, isActive: !currentStatus });
            if (response.success) fetchData();
          }
          break;
        case 'heritage':
          const heritage = heritageSections.find(h => h.id === id);
          if (heritage) {
            response = await api.homepageSections.updateHeritage(id, { ...heritage, isActive: !currentStatus });
            if (response.success) fetchData();
          }
          break;
        case 'testimonials':
          const testimonial = testimonials.find(t => t.id === id);
          if (testimonial) {
            response = await api.homepageSections.updateTestimonial(id, { ...testimonial, isActive: !currentStatus });
            if (response.success) fetchData();
          }
          break;
      }
    } catch (error) {
      console.error('Error toggling status:', error);
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
      if (response?.success) fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Sections</h1>
          <p className="text-gray-500 mt-1">Manage all dynamic homepage content</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New
        </Button>
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
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
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
                  <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover mr-3" />
                )}
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
            </td>
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
                  <img src={item.image} alt={item.title} className="h-10 w-10 rounded-lg object-cover mr-3" />
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
                  <img src={item.image} alt={item.designer?.businessName} className="h-10 w-10 rounded-full object-cover mr-3" />
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
                  <img src={item.image} alt={item.title} className="h-10 w-10 rounded-lg object-cover mr-3" />
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
                  <img src={item.avatar} alt={item.name} className="h-10 w-10 rounded-full object-cover mr-3" />
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
function SectionModal({ type, item, onClose, onSave }: { type: SectionType; item: any; onClose: () => void; onSave: () => void }) {
  // Helper function to format section name (camelCase to Title Case)
  const formatSectionName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  };


  const [formData, setFormData] = useState<any>(item || getDefaultFormData(type));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function getDefaultFormData(sectionType: SectionType) {
    switch (sectionType) {
      case 'countries':
        return { name: '', flag: '', image: '', fabrics: '', displayOrder: 0, isActive: true };
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.upload.image(formData);
      if (response.success) {
        setFormData((prev: any) => ({ ...prev, [field]: response.data.url }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let response;
      if (item?.id) {
        // Update existing
        switch (type) {
          case 'countries':
            response = await api.homepageSections.updateCountry(item.id, formData);
            break;
          case 'howItWorks':
            response = await api.homepageSections.updateHowItWorksStep(item.id, formData);
            break;
          case 'categories':
            response = await api.homepageSections.updateCategory(item.id, formData);
            break;
          case 'designerSpotlight':
            response = await api.homepageSections.updateDesignerSpotlight(item.id, formData);
            break;
          case 'heritage':
            response = await api.homepageSections.updateHeritage(item.id, formData);
            break;
          case 'testimonials':
            response = await api.homepageSections.updateTestimonial(item.id, formData);
            break;
          case 'footer':
            response = await api.homepageSections.updateFooter(item.id, formData);
            break;
        }
      } else {
        // Create new
        switch (type) {
          case 'countries':
            response = await api.homepageSections.createCountry(formData);
            break;
          case 'howItWorks':
            response = await api.homepageSections.createHowItWorksStep(formData);
            break;
          case 'categories':
            response = await api.homepageSections.createCategory(formData);
            break;
          case 'designerSpotlight':
            response = await api.homepageSections.createDesignerSpotlight(formData);
            break;
          case 'heritage':
            response = await api.homepageSections.createHeritage(formData);
            break;
          case 'testimonials':
            response = await api.homepageSections.createTestimonial(formData);
            break;
          case 'footer':
            response = await api.homepageSections.createFooter(formData);
            break;
        }
      }
      if (response?.success) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving item:', error);
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flag Emoji</label>
              <input
                type="text"
                value={formData.flag || ''}
                onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="🇬🇭"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fabrics</label>
              <input
                type="text"
                value={formData.fabrics || ''}
                onChange={(e) => setFormData({ ...formData, fabrics: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Kente, Adinkra"
              />
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
              />
            </div>
          </>
        );
      case 'designerSpotlight':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designer ID</label>
              <input
                type="text"
                value={formData.designerId || ''}
                onChange={(e) => setFormData({ ...formData, designerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
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
            {item ? 'Edit' : 'Add'} {formatSectionName(type)}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {renderFormFields()}

          {/* Image Upload */}
          {(type === 'countries' || type === 'categories' || type === 'designerSpotlight' || type === 'heritage' || type === 'testimonials') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <div className="flex items-center gap-4">
                {formData.image && (
                  <img src={formData.image} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
                )}
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'image')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
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
            <Button type="submit" disabled={saving || uploading}>
              {saving ? 'Saving...' : item ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
