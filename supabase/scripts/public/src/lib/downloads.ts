const STORAGE_KEY = 'sovereign_downloads';
const FREE_PREMIUM_KEY = 'sovereign_free_premium_downloads';

interface DownloadState {
  count: number;
  date: string;
}

const getToday = () => new Date().toISOString().slice(0, 10);

export const getDownloadsUsedToday = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const state: DownloadState = JSON.parse(raw);
    if (state.date !== getToday()) return 0;
    return state.count;
  } catch {
    return 0;
  }
};

export const incrementDownloadsUsed = (): number => {
  const current = getDownloadsUsedToday();
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: next, date: getToday() }));
  return next;
};

// Free users get 3 total watermark-free downloads (lifetime, not daily)
export const FREE_WATERMARK_FREE_LIMIT = 3;

export const getFreePremiumDownloadsUsed = (): number => {
  try {
    const raw = localStorage.getItem(FREE_PREMIUM_KEY);
    if (!raw) return 0;
    return parseInt(raw, 10) || 0;
  } catch {
    return 0;
  }
};

export const getFreePremiumDownloadsRemaining = (): number => {
  return Math.max(0, FREE_WATERMARK_FREE_LIMIT - getFreePremiumDownloadsUsed());
};

export const incrementFreePremiumDownloads = (): number => {
  const current = getFreePremiumDownloadsUsed();
  const next = current + 1;
  localStorage.setItem(FREE_PREMIUM_KEY, String(next));
  return next;
};

export const canDownloadWithoutWatermark = (isPaid: boolean): boolean => {
  if (isPaid) return true;
  return getFreePremiumDownloadsRemaining() > 0;
};
