import { prisma, UserRole } from '../db';

export type VendorRole = 'FABRIC_SELLER' | 'FASHION_DESIGNER';

export type VendorProfileFieldType =
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

export interface VendorProfileFieldInput {
  key: string;
  label: string;
  fieldType: VendorProfileFieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

const ALLOWED_FIELD_TYPES = new Set<VendorProfileFieldType>([
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'SELECT',
  'MULTI_SELECT',
  'EMAIL',
  'PHONE',
  'URL',
  'DOCUMENT',
  'IMAGE',
]);

export function normalizeVendorRole(value: string | undefined | null): VendorRole | null {
  if (value === UserRole.FABRIC_SELLER) return UserRole.FABRIC_SELLER;
  if (value === UserRole.FASHION_DESIGNER) return UserRole.FASHION_DESIGNER;
  return null;
}

function sanitizeKey(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function defaultFieldsForRole(role: VendorRole): VendorProfileFieldInput[] {
  const base: VendorProfileFieldInput[] = [
    { key: 'brand_name', label: 'Brand / Business Name', fieldType: 'TEXT', required: true, sortOrder: 1 },
    { key: 'business_email', label: 'Business Email', fieldType: 'EMAIL', required: true, sortOrder: 2 },
    { key: 'business_phone', label: 'Business Phone', fieldType: 'PHONE', required: true, sortOrder: 3 },
    { key: 'country', label: 'Country', fieldType: 'TEXT', required: true, sortOrder: 4 },
    { key: 'city', label: 'City', fieldType: 'TEXT', required: true, sortOrder: 5 },
    { key: 'address', label: 'Business Address', fieldType: 'TEXTAREA', required: true, sortOrder: 6 },
    { key: 'profile_image', label: 'Profile Image', fieldType: 'IMAGE', required: true, sortOrder: 7 },
    {
      key: 'verification_document',
      label: 'Verification Document',
      fieldType: 'DOCUMENT',
      required: true,
      sortOrder: 8,
    },
  ];

  if (role === UserRole.FASHION_DESIGNER) {
    base.push(
      { key: 'bio', label: 'Designer Bio', fieldType: 'TEXTAREA', required: true, sortOrder: 9 },
      { key: 'portfolio_url', label: 'Portfolio URL', fieldType: 'URL', required: false, sortOrder: 10 }
    );
  } else {
    base.push({ key: 'materials_specialty', label: 'Materials Specialty', fieldType: 'TEXT', required: false, sortOrder: 9 });
  }

  return base;
}

export async function ensureVendorProfileFieldDefaults(role: VendorRole) {
  const existingCount = await prisma.vendorProfileField.count({
    where: { role },
  });
  if (existingCount > 0) return;

  const defaults = defaultFieldsForRole(role);
  await prisma.vendorProfileField.createMany({
    data: defaults.map((field) => ({
      role,
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      placeholder: field.placeholder || null,
      helpText: field.helpText || null,
      required: Boolean(field.required),
      options: field.options || undefined,
      sortOrder: field.sortOrder || 0,
      isActive: field.isActive ?? true,
    })),
    skipDuplicates: true,
  });
}

export async function getVendorProfileFields(role: VendorRole) {
  await ensureVendorProfileFieldDefaults(role);
  return prisma.vendorProfileField.findMany({
    where: { role, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export function normalizeVendorProfileFieldInput(input: VendorProfileFieldInput) {
  const key = sanitizeKey(input.key);
  const fieldType = String(input.fieldType || '').toUpperCase() as VendorProfileFieldType;
  if (!key) throw new Error('Field key is required.');
  if (!input.label?.trim()) throw new Error(`Field "${key}" label is required.`);
  if (!ALLOWED_FIELD_TYPES.has(fieldType)) throw new Error(`Field "${key}" has unsupported fieldType "${input.fieldType}".`);

  const options = Array.isArray(input.options)
    ? input.options.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return {
    key,
    label: input.label.trim(),
    fieldType,
    placeholder: input.placeholder?.trim() || null,
    helpText: input.helpText?.trim() || null,
    required: Boolean(input.required),
    options: options.length ? options : undefined,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isActive: input.isActive ?? true,
  };
}

function valueToString(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateVendorProfileData(
  fields: Array<{
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    options: any;
  }>,
  rawData: Record<string, unknown>
) {
  const errors: string[] = [];
  const normalized: Record<string, unknown> = {};

  for (const field of fields) {
    const value = rawData?.[field.key];
    const type = String(field.fieldType || '').toUpperCase() as VendorProfileFieldType;
    const options = Array.isArray(field.options)
      ? field.options.map((item: unknown) => String(item || '').trim()).filter(Boolean)
      : [];

    if (type === 'MULTI_SELECT') {
      const arr = Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
      if (field.required && arr.length === 0) {
        errors.push(`${field.label} is required.`);
      }
      if (options.length && arr.some((item) => !options.includes(item))) {
        errors.push(`${field.label} contains invalid selection.`);
      }
      normalized[field.key] = arr;
      continue;
    }

    if (type === 'NUMBER') {
      const parsed = Number(value);
      if (field.required && !Number.isFinite(parsed)) {
        errors.push(`${field.label} must be a number.`);
      }
      if (Number.isFinite(parsed)) normalized[field.key] = parsed;
      continue;
    }

    const asString = valueToString(value);
    if (field.required && !asString) {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (!asString) {
      normalized[field.key] = '';
      continue;
    }

    if (type === 'EMAIL' && !isValidEmail(asString)) {
      errors.push(`${field.label} must be a valid email.`);
    } else if (type === 'URL' && !isValidUrl(asString)) {
      errors.push(`${field.label} must be a valid URL.`);
    } else if (type === 'SELECT' && options.length && !options.includes(asString)) {
      errors.push(`${field.label} has an invalid selection.`);
    } else if ((type === 'IMAGE' || type === 'DOCUMENT') && !isValidUrl(asString) && !asString.startsWith('/uploads/')) {
      errors.push(`${field.label} must be an uploaded file URL.`);
    }

    normalized[field.key] = asString;
  }

  return { errors, normalized };
}

export async function isBrandNameTaken(brandName: string, excludeUserId?: string | null) {
  const normalizedName = String(brandName || '').trim();
  if (!normalizedName) return false;

  const [seller, designer] = await Promise.all([
    prisma.fabricSellerProfile.findFirst({
      where: {
        businessName: { equals: normalizedName, mode: 'insensitive' },
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    }),
    prisma.designerProfile.findFirst({
      where: {
        businessName: { equals: normalizedName, mode: 'insensitive' },
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    }),
  ]);

  return Boolean(seller || designer);
}
