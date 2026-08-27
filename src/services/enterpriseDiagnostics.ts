/**
 * enterpriseDiagnostics.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Runtime health-check for Enterprise-tier users.
 * Validates role, OpenAI connectivity, and unlimited-credit bypass flag.
 */

import { testOpenAIConnection } from './openaiService';

export interface DiagnosticsResult {
  isEnterpriseRoleValid: boolean;
  openAiStatus: boolean;
  databaseStatus: boolean;
  bypassLimitsActive: boolean;
}

export interface EnterpriseUser {
  plan?: string;
  subscription_tier?: string;
  is_unlimited?: boolean;
  credits?: { isUnlimited?: boolean };
}

export async function runEnterpriseDiagnostics(
  user: EnterpriseUser,
): Promise<DiagnosticsResult> {
  const results: DiagnosticsResult = {
    isEnterpriseRoleValid: false,
    openAiStatus: false,
    databaseStatus: false,
    bypassLimitsActive: false,
  };

  results.isEnterpriseRoleValid =
    user?.plan === 'ENTERPRISE' || user?.subscription_tier === 'enterprise';

  const aiTest = await testOpenAIConnection();
  results.openAiStatus = aiTest.success;

  // databaseStatus — extend with a real Supabase ping when needed.
  results.databaseStatus = false;

  results.bypassLimitsActive =
    results.isEnterpriseRoleValid &&
    (user?.credits?.isUnlimited === true || user?.is_unlimited === true);

  console.table(results);
  return results;
}
