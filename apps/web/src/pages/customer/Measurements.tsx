import { useState, useEffect } from 'react';
import { 
  Ruler, 
  Save, 
  Plus, 
  Trash2, 
  Edit2,
  Info,
  User
} from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface MeasurementSet {
  id: string;
  name: string;
  measurements: Record<string, number>;
  createdAt: string;
  isDefault: boolean;
}

const defaultMeasurements = [
  { key: 'height', label: 'Height', unit: 'cm', description: 'Total height from head to toe' },
  { key: 'bust', label: 'Bust', unit: 'cm', description: 'Fullest part of the bust' },
  { key: 'waist', label: 'Waist', unit: 'cm', description: 'Narrowest part of the waist' },
  { key: 'hips', label: 'Hips', unit: 'cm', description: 'Fullest part of the hips' },
  { key: 'shoulder', label: 'Shoulder Width', unit: 'cm', description: 'Width across shoulders' },
  { key: 'sleeve', label: 'Sleeve Length', unit: 'cm', description: 'From shoulder to wrist' },
  { key: 'neck', label: 'Neck', unit: 'cm', description: 'Circumference of neck' },
  { key: 'chest', label: 'Chest', unit: 'cm', description: 'Circumference of chest' },
  { key: 'armhole', label: 'Armhole', unit: 'cm', description: 'Circumference of armhole' },
  { key: 'wrist', label: 'Wrist', unit: 'cm', description: 'Circumference of wrist' },
  { key: 'thigh', label: 'Thigh', unit: 'cm', description: 'Circumference of thigh' },
  { key: 'knee', label: 'Knee', unit: 'cm', description: 'Circumference of knee' },
  { key: 'ankle', label: 'Ankle', unit: 'cm', description: 'Circumference of ankle' },
  { key: 'inseam', label: 'Inseam', unit: 'cm', description: 'From crotch to ankle' },
  { key: 'outseam', label: 'Outseam', unit: 'cm', description: 'From waist to ankle' },
];

export default function CustomerMeasurements() {
  const [measurementSets, setMeasurementSets] = useState<MeasurementSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSet, setEditingSet] = useState<MeasurementSet | null>(null);
  const [showGuide, setShowGuide] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    measurements: {} as Record<string, number>,
  });

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from the API
      // const response = await api.customer.getMeasurements();
      // if (response.success) setMeasurementSets(response.data);
      
      // Mock data for now
      setMeasurementSets([
        {
          id: '1',
          name: 'My Standard Measurements',
          measurements: {
            height: 170,
            bust: 90,
            waist: 70,
            hips: 95,
            shoulder: 40,
            sleeve: 60,
          },
          createdAt: new Date().toISOString(),
          isDefault: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.customer.saveMeasurements({
        name: formData.name,
        measurements: formData.measurements,
      });
      
      setShowForm(false);
      setFormData({ name: '', measurements: {} });
      fetchMeasurements();
    } catch (error) {
      console.error('Failed to save measurements:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // await api.customer.deleteMeasurement(id);
      setMeasurementSets(measurementSets.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete measurement:', error);
    }
  };

  const handleMeasurementChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [key]: parseFloat(value) || 0,
      },
    }));
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
        <h1 className="text-2xl font-bold text-gray-900">My Measurements</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Measurement Set
        </Button>
      </div>

      {/* Measurement Guide */}
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">How to Measure</h3>
            <p className="text-sm text-blue-700 mt-1">
              Accurate measurements ensure the perfect fit. Click the info icon next to any measurement to see how to measure it correctly.
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSet ? 'Edit Measurements' : 'Add New Measurement Set'}
          </h2>
          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Set Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My Standard Measurements"
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultMeasurements.map((m) => (
                <div key={m.key} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {m.label}
                    <button
                      type="button"
                      onClick={() => setShowGuide(showGuide === m.key ? null : m.key)}
                      className="ml-2 text-blue-500 hover:text-blue-600"
                    >
                      <Info className="w-4 h-4 inline" />
                    </button>
                  </label>
                  {showGuide === m.key && (
                    <div className="absolute z-10 bottom-full left-0 mb-2 p-3 bg-gray-900 text-white text-sm rounded-lg w-64">
                      {m.description}
                      <div className="absolute bottom-0 left-4 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.measurements[m.key] || ''}
                      onChange={(e) => handleMeasurementChange(m.key, e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border rounded-lg pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {m.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save Measurements
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingSet(null);
                  setFormData({ name: '', measurements: {} });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Saved Measurement Sets */}
      <div className="space-y-4">
        {measurementSets.map((set) => (
          <div key={set.id} className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{set.name}</h3>
                    {set.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Created {new Date(set.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingSet(set);
                    setFormData({
                      name: set.name,
                      measurements: set.measurements,
                    });
                    setShowForm(true);
                  }}
                  className="p-2 text-gray-400 hover:text-amber-600 transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(set.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(set.measurements).map(([key, value]) => {
                const measurement = defaultMeasurements.find(m => m.key === key);
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">{measurement?.label || key}</p>
                    <p className="font-medium">{value} {measurement?.unit || 'cm'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {measurementSets.length === 0 && !showForm && (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Ruler className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No measurements saved</h3>
            <p className="text-gray-500 mb-4">Add your measurements for faster checkout.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Measurements
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
