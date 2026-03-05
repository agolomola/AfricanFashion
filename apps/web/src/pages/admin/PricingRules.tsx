import { useEffect, useState } from 'react';
import { Calendar, Edit, Globe, Percent, Plus, Tag, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface PricingRule {
  id: string;
  name: string;
  description?: string;
  ruleType: 'GLOBAL_MARKUP' | 'CATEGORY_MARKUP' | 'COUNTRY_MARKUP' | 'DATE_BASED';
  productType?: 'FABRIC' | 'DESIGN' | 'READY_TO_WEAR' | null;
  country?: string | null;
  adjustmentType: 'PERCENTAGE_MARKUP' | 'PERCENTAGE_DISCOUNT' | 'FIXED_MARKUP' | 'FIXED_DISCOUNT';
  value: number;
  priority: number;
  isSale: boolean;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

interface PricingRuleForm {
  name: string;
  description: string;
  ruleType: 'GLOBAL_MARKUP' | 'CATEGORY_MARKUP' | 'COUNTRY_MARKUP' | 'DATE_BASED';
  productType: '' | 'FABRIC' | 'DESIGN' | 'READY_TO_WEAR';
  country: string;
  adjustmentType: 'PERCENTAGE_MARKUP' | 'PERCENTAGE_DISCOUNT' | 'FIXED_MARKUP' | 'FIXED_DISCOUNT';
  value: number;
  priority: number;
  isSale: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const EMPTY_FORM: PricingRuleForm = {
  name: '',
  description: '',
  ruleType: 'GLOBAL_MARKUP',
  productType: '',
  country: '',
  adjustmentType: 'PERCENTAGE_MARKUP',
  value: 0,
  priority: 0,
  isSale: false,
  startDate: '',
  endDate: '',
  isActive: true,
};

export default function AdminPricingRules() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<PricingRuleForm>(EMPTY_FORM);

  useEffect(() => {
    void fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getPricingRules();
      if (response.success) {
        setRules(
          (response.data || []).map((rule: any) => ({
            ...rule,
            value: Number(rule.value || 0),
            priority: Number(rule.priority || 0),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch pricing rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        ruleType: formData.ruleType,
        productType: formData.productType || undefined,
        country: formData.ruleType === 'COUNTRY_MARKUP' ? formData.country || undefined : undefined,
        adjustmentType: formData.adjustmentType,
        value: Number(formData.value),
        priority: Number(formData.priority),
        isSale: formData.isSale,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
      };
      if (editingRule) {
        await api.admin.updatePricingRule(editingRule.id, payload);
      } else {
        await api.admin.createPricingRule(payload);
      }
      setShowForm(false);
      setEditingRule(null);
      resetForm();
      fetchRules();
    } catch (error) {
      console.error('Failed to save pricing rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await api.admin.deletePricingRule(id);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete pricing rule:', error);
    }
  };

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      ruleType: rule.ruleType,
      productType: rule.productType || '',
      country: rule.country || '',
      adjustmentType: rule.adjustmentType,
      value: Number(rule.value || 0),
      priority: Number(rule.priority || 0),
      isSale: Boolean(rule.isSale),
      startDate: rule.startDate ? String(rule.startDate).split('T')[0] : '',
      endDate: rule.endDate ? String(rule.endDate).split('T')[0] : '',
      isActive: rule.isActive,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
  };

  const getRuleIcon = (ruleType: PricingRule['ruleType']) => {
    switch (ruleType) {
      case 'COUNTRY_MARKUP':
        return <Globe className="w-4 h-4" />;
      case 'DATE_BASED':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
          <p className="text-gray-500 mt-1">Manage dynamic pricing for products and regions</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Sale 2024"
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing Rule Type *
                </label>
                <select
                  value={formData.ruleType}
                  onChange={(e) => setFormData({ ...formData, ruleType: e.target.value as PricingRuleForm['ruleType'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="GLOBAL_MARKUP">Global Markup</option>
                  <option value="CATEGORY_MARKUP">Category/Product Markup</option>
                  <option value="COUNTRY_MARKUP">Country Markup</option>
                  <option value="DATE_BASED">Date-based Rule</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={formData.adjustmentType}
                  onChange={(e) =>
                    setFormData({ ...formData, adjustmentType: e.target.value as PricingRuleForm['adjustmentType'] })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="PERCENTAGE_MARKUP">Percentage Markup (+%)</option>
                  <option value="PERCENTAGE_DISCOUNT">Percentage Discount (-%)</option>
                  <option value="FIXED_MARKUP">Fixed Markup (+amount)</option>
                  <option value="FIXED_DISCOUNT">Fixed Discount (-amount)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type (optional)
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value as PricingRuleForm['productType'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">All Product Types</option>
                  <option value="FABRIC">Fabric</option>
                  <option value="DESIGN">Design</option>
                  <option value="READY_TO_WEAR">Ready To Wear</option>
                </select>
              </div>
              {formData.ruleType === 'COUNTRY_MARKUP' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country Code *
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                    placeholder="e.g., NG"
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              {formData.ruleType === 'DATE_BASED' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSale"
                checked={formData.isSale}
                onChange={(e) => setFormData({ ...formData, isSale: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isSale" className="text-sm text-gray-700">
                Mark as sale rule
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => { setShowForm(false); setEditingRule(null); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rule</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Scope</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Adjustment</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{rule.name}</p>
                    {rule.description && <p className="text-xs text-gray-500">{rule.description}</p>}
                    {rule.startDate && rule.endDate && (
                      <p className="text-xs text-gray-500">
                        {new Date(rule.startDate).toLocaleDateString()} - {rule.endDate ? new Date(rule.endDate).toLocaleDateString() : 'Ongoing'}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">
                      {rule.ruleType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getRuleIcon(rule.ruleType)}
                      <span className="text-sm">
                        {rule.country || rule.productType || 'Global'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">
                      {rule.adjustmentType} ({Number(rule.value || 0)})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={rule.isActive ? 'green' : 'gray'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rules.length === 0 && (
          <div className="text-center py-16">
            <Percent className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pricing rules</h3>
            <p className="text-gray-500 mb-4">Create your first pricing rule to get started.</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
