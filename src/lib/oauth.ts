import { supabase } from '@/integrations/supabase/client';
import type { Provider } from '@supabase/supabase-js';
import { oauthRedirectUrl, stashGuestDraft, type GuestActionKind } from '@/lib/guestMode';

export type SocialProvider = 'google' | 'linkedin_oidc';

export async function startSocialLogin(
  provider: SocialProvider,
  opts?: {
    redirectPath?: string;
    draft?: {
      kind: GuestActionKind | 'mixed';
      jobDescription?: string;
      generatedProposal?: string;
      cvText?: string;
    };
  },
): Promise<{ error: string | null }> {
  const path = opts?.redirectPath || `${window.location.pathname}${window.location.search}` || '/dashboard';
  if (opts?.draft) {
    stashGuestDraft({
      kind: opts.draft.kind,
      path,
      jobDescription: opts.draft.jobDescription,
      generatedProposal: opts.draft.generatedProposal,
      cvText: opts.draft.cvText,
    });
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: oauthRedirectUrl(path.startsWith('/') ? path.split('?')[0] : '/dashboard'),
      queryParams: provider === 'google'
        ? { access_type: 'offline', prompt: 'select_account' }
        : undefined,
      scopes: provider === 'linkedin_oidc' ? 'openid profile email' : undefined,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}
