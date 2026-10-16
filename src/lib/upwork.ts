export const UPWORK_JOBS_SEARCH_URL = 'https://www.upwork.com/nx/search/jobs';

export function resolveUpworkJobUrl(raw?: string | null): string {
  const value = String(raw ?? '').trim();
  const match = value.match(/https?:\/\/[^\s)"']*upwork\.com[^\s)"']*/i);
  if (match?.[0]) return match[0].replace(/[.,;]+$/, '');
  if (/^https?:\/\//i.test(value)) return value;
  return UPWORK_JOBS_SEARCH_URL;
}

export function upworkSearchUrl(query?: string | null): string {
  const q = String(query ?? '').trim();
  if (!q) return UPWORK_JOBS_SEARCH_URL;
  return `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(q)}`;
}

export function openUpworkJob(raw?: string | null): void {
  if (typeof window === 'undefined') return;
  window.open(resolveUpworkJobUrl(raw), '_blank', 'noopener,noreferrer');
}
