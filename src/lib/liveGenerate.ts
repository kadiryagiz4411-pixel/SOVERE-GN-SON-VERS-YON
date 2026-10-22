import { supabase } from '@/integrations/supabase/client';
import { resolveOpenAIKey } from '@/lib/apiKeyResolver';

export type LiveJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

/** Relative API path on the live origin. Never localhost, never a trailing slash. */
export function liveApiPath(path: string): string {
  const raw = String(path || '').trim();
  if (!raw) return '/api';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (/localhost|127\.0\.0\.1/i.test(url.hostname)) {
        return url.pathname.replace(/\/$/, '') || '/api';
      }
      return `${url.origin}${url.pathname}`.replace(/\/$/, '');
    } catch {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, '') || '/api';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function readGeneratedText(payload: unknown, keys: string[]): string {
  const rec = asRecord(payload);
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const nested = asRecord(rec.data);
  for (const key of keys) {
    const value = nested[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export async function postLiveJson<T>(path: string, body: Record<string, unknown>): Promise<LiveJsonResult<T>> {
  const url = `${liveApiPath(path)}?t=${Date.now()}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const customApiKey = resolveOpenAIKey();
  const payload = customApiKey ? { ...body, customApiKey } : { ...body };

  try {
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => null) as T & { error?: string } | null;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: json,
        error: String(json?.error || `HTTP ${response.status}`),
      };
    }
    return { ok: true, status: response.status, data: json, error: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export function postLiveCv(body: Record<string, unknown>) {
  return postLiveJson<{ cv?: string; proposal?: string; error?: string }>('/api/generate-cv', body);
}

export function postLiveProposal(body: Record<string, unknown>) {
  return postLiveJson<{ proposal?: string; proposalText?: string; error?: string }>('/api/proposal', body);
}

export function postLiveFollowup(body: Record<string, unknown>) {
  return postLiveJson<{
    followUp3?: string;
    followUp7?: string;
    questions?: Array<{ question?: string; suggestedAnswer?: string; tip?: string }>;
    error?: string;
    message?: string;
    fallback?: boolean;
  }>('/api/generate-followup', body);
}
