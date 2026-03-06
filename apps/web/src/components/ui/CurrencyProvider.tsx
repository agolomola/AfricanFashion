import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../services/api';

type CurrencyContextValue = {
  selectedCurrency: string;
  supportedCurrencies: string[];
  setSelectedCurrency: (currency: string) => void;
  defaultCurrency: string;
  convertFromUsd: (amountUsd: number, toCurrency?: string) => number;
  formatFromUsd: (amountUsd: number, currency?: string) => string;
  usdPerUnitByCurrency: Record<string, number>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [selectedCurrency, setSelectedCurrencyState] = useState('USD');
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['USD']);
  const [usdPerUnitByCurrency, setUsdPerUnitByCurrency] = useState<Record<string, number>>({ USD: 1 });
  const [visitorCurrencyScope, setVisitorCurrencyScope] = useState('GLOBAL');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await api.currency.getConfig();
        if (!response.success) return;
        const matrix = response.data.matrix || [];
        const rates =
          response.data.usdPerUnitByCurrency ||
          matrix.reduce<Record<string, number>>((acc, row) => {
            acc[row.currencyCode] = Number(row.usdPerUnit || 0);
            return acc;
          }, { USD: 1 });
        setUsdPerUnitByCurrency(rates);
        setSupportedCurrencies(response.data.supportedCurrencies || ['USD']);
        const detected = response.data.defaultCurrency || 'USD';
        setDefaultCurrency(detected);
        const visitorCountryCode = response.data.visitorCountry?.countryCode || 'GLOBAL';
        setVisitorCurrencyScope(visitorCountryCode);
        const persisted = window.localStorage.getItem(`preferred-currency:${visitorCountryCode}`);
        const initial =
          persisted && (response.data.supportedCurrencies || []).includes(persisted) ? persisted : detected;
        setSelectedCurrencyState(initial || 'USD');
      } catch (error) {
        console.error('Failed to load currency configuration:', error);
      }
    };
    void bootstrap();
  }, []);

  const setSelectedCurrency = (currency: string) => {
    const next = String(currency || '').toUpperCase();
    if (!supportedCurrencies.includes(next)) return;
    setSelectedCurrencyState(next);
    window.localStorage.setItem(`preferred-currency:${visitorCurrencyScope}`, next);
  };

  const convertFromUsd = (amountUsd: number, toCurrency = selectedCurrency) => {
    const usdAmount = Number(amountUsd || 0);
    const code = String(toCurrency || 'USD').toUpperCase();
    if (!Number.isFinite(usdAmount)) return 0;
    if (code === 'USD') return usdAmount;
    const usdPerUnit = Number(usdPerUnitByCurrency[code] || 0);
    if (!Number.isFinite(usdPerUnit) || usdPerUnit <= 0) return usdAmount;
    return usdAmount / usdPerUnit;
  };

  const formatFromUsd = (amountUsd: number, currency = selectedCurrency) => {
    const code = String(currency || 'USD').toUpperCase();
    const converted = convertFromUsd(amountUsd, code);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      return `${code} ${converted.toFixed(2)}`;
    }
  };

  const value = useMemo<CurrencyContextValue>(
    () => ({
      selectedCurrency,
      supportedCurrencies,
      setSelectedCurrency,
      defaultCurrency,
      convertFromUsd,
      formatFromUsd,
      usdPerUnitByCurrency,
    }),
    [selectedCurrency, supportedCurrencies, defaultCurrency, usdPerUnitByCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
