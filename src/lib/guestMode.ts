export const GUEST_ACTION_LIMIT = 2;
export const GUEST_STORAGE_KEY = 'sovereign.guest.actions.v1';
export const GUEST_DRAFT_KEY = 'sovereign.guest.draft.v1';
export const GUEST_GATE_EVENT = 'sovereign:guest-gate';

export type GuestActionKind = 'proposal' | 'cv';

export interface GuestState {
  id: string;
  used: number;
}

export interface GuestDraft {
  kind: GuestActionKind | 'mixed';
  path: string;
  jobDescription?: string;
  generatedProposal?: string;
  cvText?: string;
  at: number;
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readRaw(): GuestState {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '{}') as Partial<GuestState>;
    const used = Math.max(0, Math.min(GUEST_ACTION_LIMIT, Number(parsed.used) || 0));
    const id = String(parsed.id || '').trim() || randomId();
    if (!parsed.id) writeRaw({ id, used });
    return { id, used };
  } catch {
    const fresh = { id: randomId(), used: 0 };
    writeRaw(fresh);
    return fresh;
  }
}

function writeRaw(state: GuestState): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

const GUEST_TOKEN_KEY = `${GUEST_STORAGE_KEY}.token`;
let lastTokenPersistAt = 0;

export function persistGuestToken(token?: string | null): void {
  const value = String(token || '').trim();
  if (!value || value.split('.').length < 3) return;
  const [id, usedStr] = value.split('.');
  const used = Number(usedStr);
  const current = readRaw();
  writeRaw({
    id: id || current.id,
    used: Math.max(current.used, Number.isFinite(used) ? used : current.used),
  });
  lastTokenPersistAt = Date.now();
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, value);
  } catch {
    /* ignore */
  }
}

export function guestHeaderValue(): string {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY) || getGuestState().id;
  } catch {
    return getGuestState().id;
  }
}

export function getGuestState(): GuestState {
  return readRaw();
}

export function guestActionsRemaining(): number {
  return Math.max(0, GUEST_ACTION_LIMIT - readRaw().used);
}

export function guestCanAct(): boolean {
  return readRaw().used < GUEST_ACTION_LIMIT;
}

export function recordGuestAction(): GuestState {
  const current = readRaw();
  if (Date.now() - lastTokenPersistAt < 4000) return current;
  const next = { ...current, used: Math.min(GUEST_ACTION_LIMIT, current.used + 1) };
  writeRaw(next);
  return next;
}

export function stashGuestDraft(draft: Omit<GuestDraft, 'at'>): void {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify({ ...draft, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function hasFreshGuestDraft(): boolean {
  const draft = readGuestDraft();
  if (!draft) return false;
  return Date.now() - (draft.at || 0) < 6 * 60 * 60 * 1000;
}

export function readGuestDraft(): GuestDraft | null {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestDraft(): void {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function openGuestGate(detail?: { kind?: GuestActionKind }): void {
  window.dispatchEvent(new CustomEvent(GUEST_GATE_EVENT, { detail: detail || {} }));
}

export function oauthRedirectUrl(path = '/dashboard'): string {
  const origin = window.location.origin.includes('sovereignapp.pro')
    ? 'https://sovereignapp.pro'
    : window.location.origin;
  const safe = path.startsWith('/') ? path : '/dashboard';
  const url = new URL(safe, origin);
  url.searchParams.set('oauth', '1');
  return url.toString();
}
