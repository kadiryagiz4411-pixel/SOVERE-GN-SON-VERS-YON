// CV Generation Credits Tracking
const STORAGE_KEY = 'sovereign_cv_generations';

interface CVCreditState {
  count: number;
  date: string;
}

const getToday = () => new Date().toISOString().slice(0, 10);

export const getCVGenerationsToday = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const state: CVCreditState = JSON.parse(raw);
    if (state.date !== getToday()) return 0;
    return state.count;
  } catch {
    return 0;
  }
};

export const incrementCVGenerations = (): number => {
  const current = getCVGenerationsToday();
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: next, date: getToday() }));
  return next;
};

// Plan-based CV limits
export const CV_LIMITS = {
  free: 1,
  pro: 3,
  elite: Infinity,
} as const;

export const getCVLimit = (plan: string): number => {
  const key = plan.toLowerCase() as keyof typeof CV_LIMITS;
  return CV_LIMITS[key] ?? CV_LIMITS.free;
};

export const canGenerateCV = (plan: string): boolean => {
  const limit = getCVLimit(plan);
  if (limit === Infinity) return true;
  return getCVGenerationsToday() < limit;
};

export const getCVGenerationsRemaining = (plan: string): number | 'unlimited' => {
  const limit = getCVLimit(plan);
  if (limit === Infinity) return 'unlimited';
  return Math.max(0, limit - getCVGenerationsToday());
};

// $2.99 per extra CV credit
export const CV_EXTRA_PRICE = 2.99;
export const CV_EXTRA_CHECKOUT_URL = 'https://sovereignapp.lemonsqueezy.com/checkout/buy/f86e3532-79dc-4cab-9d74-ec98a443f8b9';
