/**
 * superadminOrg.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Canonical superadmin organization override.
 *
 * kadiryagiz4411@gmail.com always gets:
 *   • role = 'owner'
 *   • plan = 'B2B_ENTERPRISE'
 *   • All org permission flags = true
 *   • A synthetic org object when no real org exists in the DB
 *
 * Import helpers from here so every page/service stays in sync with one
 * source of truth. Changes to the sentinel values only need editing here.
 */

import { OWNER_EMAIL } from '@/lib/superadmin';

// ─── Sentinel org used when the superadmin has no DB org row ─────────────────

export const SUPERADMIN_ORG = {
  id: 'superadmin-org-id',
  name: 'Sovereign Admin Org',
  role: 'owner',
  plan: 'B2B_ENTERPRISE',
  org_role: 'owner',
  plan_type: 'B2B_ENTERPRISE',
  subscription_tier: 'enterprise_b2b',
  max_seats: 9999,
  used_seats: 0,
  cv_evaluations_used: 0,
  cv_evaluations_limit: 999999,
  license_key: 'SOVEREIGN-ADMIN',
  logo_url: null,
} as const;

export type SuperadminOrg = typeof SUPERADMIN_ORG;

// ─── Permission flag bundle granted to superadmin ─────────────────────────────

export const SUPERADMIN_ORG_PERMISSIONS = {
  isOrgMember: true,
  role: 'owner' as const,
  org_role: 'owner' as const,
  canManageTeam: true,
  canAccessCache: true,
  canViewB2B: true,
  canCreateJobs: true,
  canEvaluateCandidates: true,
  canExportData: true,
  canManageBranding: true,
} as const;

// ─── Helper: is the given email the superadmin? ───────────────────────────────

export function isSuperadminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase();
}

// ─── Helper: resolve org + role for a user, injecting superadmin defaults ────

export interface OrgProfile {
  org_id: string | null;
  org_role: string | null;
  plan_type: string | null;
}

/**
 * Returns the effective org profile for a user, injecting superadmin defaults
 * when the user is the superadmin and their DB profile lacks an org_id.
 *
 * @param dbProfile  Row returned by `.select('org_id, org_role, plan_type')`
 * @param userEmail  Caller's email — used for the superadmin check
 */
export function resolveOrgProfile(
  dbProfile: Partial<OrgProfile> | null | undefined,
  userEmail: string | null | undefined,
): OrgProfile & { isSuperAdmin: boolean } {
  const isOwner = isSuperadminEmail(userEmail);

  if (isOwner && !dbProfile?.org_id) {
    // Inject the sentinel org so downstream code doesn't redirect/throw.
    return {
      org_id: SUPERADMIN_ORG.id,
      org_role: SUPERADMIN_ORG.org_role,
      plan_type: SUPERADMIN_ORG.plan_type,
      isSuperAdmin: true,
    };
  }

  if (isOwner) {
    // Has a real org but still gets owner role elevation.
    return {
      org_id: dbProfile!.org_id!,
      org_role: 'owner',
      plan_type: dbProfile?.plan_type ?? SUPERADMIN_ORG.plan_type,
      isSuperAdmin: true,
    };
  }

  return {
    org_id: dbProfile?.org_id ?? null,
    org_role: dbProfile?.org_role ?? null,
    plan_type: dbProfile?.plan_type ?? null,
    isSuperAdmin: false,
  };
}
