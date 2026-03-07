import { AFRICAN_CURRENCY_BASELINE } from './africanCurrencies';

export interface AfricanCountryOption {
  code: string;
  name: string;
  flag: string;
}

const toFlagFromCode = (code: string) => {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🌍';
  const [first, second] = normalized;
  return String.fromCodePoint(127397 + first.charCodeAt(0), 127397 + second.charCodeAt(0));
};

export const AFRICAN_COUNTRY_OPTIONS: AfricanCountryOption[] = Array.from(
  new Map(
    AFRICAN_CURRENCY_BASELINE.map((row) => [
      row.countryCode.toUpperCase(),
      {
        code: row.countryCode.toUpperCase(),
        name: row.country,
        flag: toFlagFromCode(row.countryCode),
      },
    ])
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

export const AFRICAN_COUNTRY_BY_CODE = new Map(
  AFRICAN_COUNTRY_OPTIONS.map((option) => [option.code.toUpperCase(), option])
);

export const AFRICAN_COUNTRY_BY_NAME = new Map(
  AFRICAN_COUNTRY_OPTIONS.map((option) => [option.name.toLowerCase(), option])
);

export const countryCodeToFlag = toFlagFromCode;
