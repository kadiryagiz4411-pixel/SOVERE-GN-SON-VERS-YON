// Tracks how many times a free user has viewed (read) a generated proposal
// Resets daily

const STORAGE_KEY = 'sovereign_proposal_views';

interface ViewState {
  count: number;
  date: string;
}

const FREE_VIEW_LIMIT = 3;
const getToday = () => new Date().toISOString().slice(0, 10);

export const getProposalViewsUsed = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const state: ViewState = JSON.parse(raw);
    if (state.date !== getToday()) return 0;
    return state.count;
  } catch {
    return 0;
  }
};

export const incrementProposalViews = (): number => {
  const current = getProposalViewsUsed();
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: next, date: getToday() }));
  return next;
};

export const canViewProposal = (): boolean => {
  return getProposalViewsUsed() < FREE_VIEW_LIMIT;
};

export const getProposalViewsRemaining = (): number => {
  return Math.max(0, FREE_VIEW_LIMIT - getProposalViewsUsed());
};

export { FREE_VIEW_LIMIT };
