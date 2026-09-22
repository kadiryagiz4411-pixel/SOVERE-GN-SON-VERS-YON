import { supabase } from '@/integrations/supabase/client';

/**
 * Dashboard display name is "Sovereign"; slug may be `sovereign` or `generate-cv`.
 * Override with VITE_EDGE_CV_FUNCTION if the project uses a different slug.
 */
export const EDGE_FUNCTIONS = {
  cv: String(import.meta.env.VITE_EDGE_CV_FUNCTION ?? 'sovereign').trim() || 'sovereign',
  cvFallback: 'generate-cv',
  proposal: 'generate-proposal',
} as const;

export interface EdgeInvokeResult<T> {
  data: T | null;
  error: string | null;
  status: number;
  functionName: string;
}

function functionsBaseUrl(): string {
  return String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
}

function anonKey(): string {
  return String(
    import.meta.env.VITE_SUPABASE_ANON_KEY
    ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? '',
  );
}

export async function invokeEdgeJson<T>(
  functionName: string,
  body: unknown,
  fallbacks: string[] = [],
): Promise<EdgeInvokeResult<T>> {
  const names = [functionName, ...fallbacks.filter(name => name && name !== functionName)];
  let lastStatus = 0;
  let lastError = 'Edge function request failed';
  let lastName = functionName;

  for (const name of names) {
    lastName = name;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const base = functionsBaseUrl();
      if (!base) {
        const msg = 'Configuration Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in Vercel settings. Add it to your Vercel Environment Variables and redeploy.';
        console.error('[SOVEREIGN_ERR] edgeFunctions: ' + msg);
        return { data: null, error: msg, status: 0, functionName: name };
      }

      const response = await fetch(`${base}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      lastStatus = response.status;

      if (response.status === 404) {
        console.error(`[edge:${name}] 404 — function not found. Trying fallback if available.`, {
          url: `${base}/functions/v1/${name}`,
          fallbacks: names.slice(names.indexOf(name) + 1),
        });
        continue;
      }

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const errDetail = (json as { error?: string } | null)?.error || `HTTP ${response.status}`;
        console.error(`[SOVEREIGN_ERR] edge:${name} — HTTP ${response.status}:`, errDetail, json);
        return {
          data: null,
          error: errDetail,
          status: response.status,
          functionName: name,
        };
      }

      return { data: json as T, error: null, status: response.status, functionName: name };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isNetwork = err instanceof TypeError || /fetch|CORS|network/i.test(errMsg);
      const humanMsg = isNetwork
        ? `Connection Timeout — ${name} edge function unreachable. Check your Supabase project is running and VITE_SUPABASE_URL is correct. (${errMsg})`
        : `Edge Function Error (${name}): ${errMsg}`;
      console.error(`[SOVEREIGN_ERR] edge:${name} — network/CORS error:`, errMsg, err);
      lastError = humanMsg;
      lastStatus = 0;
    }
  }

  return { data: null, error: lastError, status: lastStatus, functionName: lastName };
}

/** CV generation: try `sovereign`, then `generate-cv`. Body matches generate-cv. */
export function invokeCvFunction<T>(body: {
  mode: string;
  targetRole?: string;
  targetCompany?: string;
  jobDescription?: string;
  outputLanguage?: string;
  existingCvText?: string;
  formData?: unknown;
}) {
  return invokeEdgeJson<T>(EDGE_FUNCTIONS.cv, body, [EDGE_FUNCTIONS.cvFallback]);
}
