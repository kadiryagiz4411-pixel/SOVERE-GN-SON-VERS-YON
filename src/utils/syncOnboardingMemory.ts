/**
 * syncPreOnboardingMemory
 *
 * Called immediately after a user signs up or logs in. Reads the
 * 'sovereign_pre_onboarding' localStorage key, maps the 10 pre-login
 * questionnaire answers to the corresponding profiles table columns, and
 * upserts the row in Supabase.
 *
 * On success the localStorage key is removed so subsequent logins do not
 * re-apply stale pre-onboarding data.
 *
 * This function:
 *   • Never throws — all errors are swallowed so a failed sync cannot block
 *     the auth flow.
 *   • Only writes columns that have a non-empty answer (no null overwrite).
 *   • Works whether the profile row was matched via `id` or `user_id`.
 *   • Sets `onboarding_completed = true` only when ALL 10 answers are present.
 */

import { supabase } from '@/integrations/supabase/client';
import { PRE_ONBOARDING_STORAGE_KEY } from '@/components/LandingOnboardingMemory';
import type { PreOnboardingAnswers } from '@/components/LandingOnboardingMemory';

const TOTAL_STEPS = 10;

const LOG = '[Sovereign Onboarding Sync]:';

/** Map from localStorage answer key → profiles column name */
const COLUMN_MAP: Record<string, string> = {
  profession:           'profession',
  platform_preference:  'platform_preference',
  experience_level:     'experience_level',
  tech_stack:           'tech_stack',
  hourly_rate_target:   'hourly_rate_target',
  availability:         'availability',
  proposal_tone:        'proposal_tone',
  main_pain_point:      'main_pain_point',
  work_mode:            'work_mode',
  primary_goal:         'primary_goal',
};

function readFromStorage(): PreOnboardingAnswers | null {
  try {
    const raw = localStorage.getItem(PRE_ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreOnboardingAnswers;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(PRE_ONBOARDING_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Build the Supabase patch object from stored answers.
 * Only includes keys that have non-empty string values.
 */
function buildPatch(answers: PreOnboardingAnswers): Record<string, string | boolean> {
  const patch: Record<string, string | boolean> = {};

  for (const [answerKey, column] of Object.entries(COLUMN_MAP)) {
    const value = answers[answerKey];
    if (value && typeof value === 'string' && value.trim()) {
      patch[column] = value.trim();
    }
  }

  // Mark onboarding_completed only when all 10 answers are present
  const answeredCount = Object.keys(answers).filter(
    (k) => COLUMN_MAP[k] && answers[k],
  ).length;
  if (answeredCount >= TOTAL_STEPS) {
    patch['onboarding_completed'] = true;
  }

  return patch;
}

/**
 * Primary export.
 * Call this from SessionContext / auth success handler with the auth user id.
 *
 * @param userId — Supabase auth.users.id (UUID string)
 */
export async function syncPreOnboardingMemory(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const answers = readFromStorage();
    if (!answers || Object.keys(answers).length === 0) return;

    const patch = buildPatch(answers);
    if (Object.keys(patch).length === 0) return;

    patch['updated_at'] = new Date().toISOString();

    // Attempt by user_id first (standard FK), then by id (PK)
    const { error: byUserId } = await supabase
      .from('profiles')
      .update(patch)
      .eq('user_id', userId);

    if (!byUserId) {
      clearStorage();
      return;
    }

    // Fallback: match by PK (profiles.id = auth user id)
    const { error: byId } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);

    if (!byId) {
      clearStorage();
      return;
    }

    // Both attempts failed — log for debugging but never surface to the user
    console.warn(LOG, 'Profile update failed, will retry on next login', {
      userId,
      byUserIdError: byUserId?.message,
      byIdError: byId?.message,
    });
  } catch (err) {
    // Never propagate — this is fire-and-forget
    console.warn(LOG, 'Unexpected error during sync', err);
  }
}
