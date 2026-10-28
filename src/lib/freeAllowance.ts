import { supabase } from '@/integrations/supabase/client';

export type FreeAllowanceKind = 'proposal' | 'cv';

export function freeAllowanceRemaining(
  row: { free_proposals_left?: unknown; free_cvs_left?: unknown } | null | undefined,
  kind: FreeAllowanceKind,
): number {
  const raw = kind === 'proposal' ? row?.free_proposals_left : row?.free_cvs_left;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Atomically spends one free proposal or CV. Returns the remaining count, or null if none were left. */
export async function consumeFreeAllowance(kind: FreeAllowanceKind): Promise<number | null> {
  const { data, error } = await supabase.rpc('consume_free_allowance', { p_kind: kind });
  if (error) {
    console.error('[free-allowance]', error.message);
    return null;
  }
  if (data === null || data === undefined) return null;
  const n = Number(data);
  return Number.isFinite(n) ? n : null;
}
