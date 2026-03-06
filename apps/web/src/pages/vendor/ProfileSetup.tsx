import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'DOCUMENT'
  | 'IMAGE';

const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export default function VendorProfileSetup() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = user?.role === 'FABRIC_SELLER';
  const roleLabel = isSeller ? 'Fabric Seller' : 'Fashion Designer';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payload, setPayload] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingKey, setUploadingKey] = useState<string>('');

  const status = String(payload?.status || 'INCOMPLETE') as 'INCOMPLETE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  const isLocked = status === 'SUBMITTED' || status === 'APPROVED';
  const fields = useMemo(() => payload?.fields || [], [payload]);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = isSeller ? await api.seller.getProfileSetup() : await api.designer.getProfileSetup();
      if (res.success) {
        setPayload(res.data);
        setFormData((res.data?.profileData as Record<string, any>) || {});
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load profile setup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.role]);

  const onChangeField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const uploadFieldFile = async (key: string, file: File) => {
    setError('');
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Image/document too large. Max ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    try {
      setUploadingKey(key);
      const data = new FormData();
      data.append('image', file);
      const res = await api.upload.image(data);
      if (res.success) {
        onChangeField(key, res.data.url);
      } else {
        setError(res.message || 'Upload failed.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed.');
    } finally {
      setUploadingKey('');
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = isSeller ? await api.seller.saveProfileSetup(formData) : await api.designer.saveProfileSetup(formData);
      if (res.success) {
        setSuccess('Profile draft saved successfully.');
        await load();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save profile draft.');
    } finally {
      setSaving(false);
    }
  };

  const submitProfile = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const saveRes = isSeller ? await api.seller.saveProfileSetup(formData) : await api.designer.saveProfileSetup(formData);
      if (!saveRes.success) {
        setError('Failed to save profile data before submission.');
        return;
      }
      const submitRes = isSeller ? await api.seller.submitProfileSetup() : await api.designer.submitProfileSetup();
      if (submitRes.success) {
        setSuccess('Profile submitted successfully. Await admin approval.');
        await load();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const key = String(field.key || '');
    const type = String(field.fieldType || 'TEXT').toUpperCase() as FieldType;
    const required = Boolean(field.required);
    const value = formData?.[key];
    const disabled = isLocked;

    if (type === 'TEXTAREA') {
      return (
        <textarea
          value={String(value || '')}
          onChange={(e) => onChangeField(key, e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
          rows={4}
          placeholder={field.placeholder || field.label}
        />
      );
    }

    if (type === 'SELECT') {
      const options = Array.isArray(field.options) ? field.options : [];
      return (
        <select
          value={String(value || '')}
          onChange={(e) => onChangeField(key, e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
        >
          <option value="">Select</option>
          {options.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'MULTI_SELECT') {
      const options = Array.isArray(field.options) ? field.options : [];
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2 rounded-lg border p-3">
          {options.map((option: string) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.includes(option)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? Array.from(new Set([...selected, option]))
                    : selected.filter((item: string) => item !== option);
                  onChangeField(key, next);
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === 'IMAGE' || type === 'DOCUMENT') {
      const fileUrl = String(value || '');
      return (
        <div className="rounded-lg border p-3">
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
              {fileUrl}
            </a>
          ) : (
            <p className="text-sm text-gray-500">No file uploaded yet.</p>
          )}
          {!disabled && (
            <label className="mt-2 inline-flex cursor-pointer items-center rounded border px-3 py-1.5 text-xs hover:bg-gray-50">
              {uploadingKey === key ? 'Uploading...' : `Upload ${type === 'IMAGE' ? 'image' : 'document'}`}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFieldFile(key, file);
                }}
              />
            </label>
          )}
        </div>
      );
    }

    const inputType =
      type === 'NUMBER'
        ? 'number'
        : type === 'DATE'
          ? 'date'
          : type === 'EMAIL'
            ? 'email'
            : type === 'PHONE'
              ? 'tel'
              : type === 'URL'
                ? 'url'
                : 'text';

    return (
      <input
        type={inputType}
        value={inputType === 'number' ? Number(value || 0) : String(value || '')}
        onChange={(e) => onChangeField(key, inputType === 'number' ? Number(e.target.value || 0) : e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
        placeholder={field.placeholder || field.label}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{roleLabel} Full Profile</h1>
        <p className="text-sm text-gray-600">
          Complete your full profile. Product upload is enabled only after admin approves this profile.
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-coral-500" />
        </div>
      ) : null}

      {!loading && (
        <>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm">
              Current status:{' '}
              <span className="font-semibold">
                {status}
              </span>
            </p>
            {payload?.reviewNotes ? <p className="mt-1 text-sm text-gray-600">Admin note: {payload.reviewNotes}</p> : null}
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}

          <div className="space-y-4 rounded-xl border bg-white p-4">
            {fields.map((field: any) => (
              <div key={field.id || field.key} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required ? <span className="ml-1 text-red-600">*</span> : null}
                </label>
                {renderField(field)}
                {field.helpText ? <p className="text-xs text-gray-500">{field.helpText}</p> : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {!isLocked ? (
              <>
                <Button variant="outline" onClick={saveDraft} disabled={saving || submitting}>
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button onClick={submitProfile} disabled={saving || submitting}>
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => navigate(isSeller ? '/seller' : '/designer')}>
                Back to Dashboard
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
