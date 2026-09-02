/** Owner account with full Tier 3 / B2B / unlimited credit privileges. */
export const OWNER_EMAIL = 'kadiryagiz4411@gmail.com';

export const SUPERADMIN_PLAN_LABEL = 'Enterprise B2B (SuperAdmin)';
export const SUPERADMIN_PLAN_TYPE = 'B2B_ENTERPRISE';

export const OWNER_PRIVILEGES = {
  appsumo_tier: 3,
  credits_remaining: 999999,
  monthly_credit_limit: 999999,
  hasB2BAccess: true,
  hasBYOKAccess: true,
  planType: SUPERADMIN_PLAN_TYPE,
  planLabel: SUPERADMIN_PLAN_LABEL,
} as const;

type AuthLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

export function resolveAuthEmail(user: AuthLike): string {
  const direct = (user?.email ?? '').trim();
  const meta = String(user?.user_metadata?.email ?? '').trim();
  return (direct || meta).toLowerCase();
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}

export function isSuperAdminUser(user: AuthLike): boolean {
  return (
    user?.email === OWNER_EMAIL ||
    resolveAuthEmail(user) === OWNER_EMAIL
  );
}
