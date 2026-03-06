import { applyOverridesToMatrix, getCurrencyOverrides, getCurrencyState, refreshMatrixFromThirdParty, resolveCurrencySyncUserId, saveCurrencyMatrix } from '../utils/currency';

let intervalHandle: NodeJS.Timeout | null = null;

async function runCurrencySync(reason: 'startup' | 'scheduler') {
  try {
    const userId = await resolveCurrencySyncUserId();
    if (!userId) {
      console.warn('[currency-sync] skipped: no admin/system user found.');
      return;
    }

    const [{ matrix }, overrides] = await Promise.all([getCurrencyState(), getCurrencyOverrides()]);
    const refreshed = await refreshMatrixFromThirdParty(matrix);
    const merged = applyOverridesToMatrix(refreshed, overrides);
    await saveCurrencyMatrix(userId, merged, { source: reason === 'startup' ? 'provider' : 'scheduler' });
    console.log(`[currency-sync] completed (${reason}) with ${merged.length} currency rows.`);
  } catch (error) {
    console.error('[currency-sync] failed:', error);
  }
}

export function startCurrencyAutoSync() {
  const enabled = String(process.env.CURRENCY_AUTO_SYNC_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[currency-sync] auto sync disabled.');
    return;
  }
  const intervalMinutes = Math.max(
    15,
    Number.parseInt(process.env.CURRENCY_SYNC_INTERVAL_MINUTES || '360', 10) || 360
  );

  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  void runCurrencySync('startup');
  intervalHandle = setInterval(() => {
    void runCurrencySync('scheduler');
  }, intervalMinutes * 60 * 1000);

  console.log(`[currency-sync] scheduled every ${intervalMinutes} minutes.`);
}
