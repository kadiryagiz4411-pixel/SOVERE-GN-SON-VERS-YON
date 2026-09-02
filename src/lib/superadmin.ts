/** Owner account with full Tier 3 / B2B / unlimited credit privileges. */
export const OWNER_EMAIL = 'kadiryagiz4411@gmail.com';

export const OWNER_PRIVILEGES = {
  appsumo_tier: 3,
  credits_remaining: 999999,
  monthly_credit_limit: 999999,
  hasB2BAccess: true,
  hasBYOKAccess: true,
} as const;

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}
