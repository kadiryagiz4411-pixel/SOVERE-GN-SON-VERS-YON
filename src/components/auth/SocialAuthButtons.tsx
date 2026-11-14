import { useState } from 'react';
import { toast } from 'sonner';
import { startSocialLogin, type SocialProvider } from '@/lib/oauth';
import type { GuestActionKind } from '@/lib/guestMode';

interface SocialAuthButtonsProps {
  redirectPath?: string;
  draft?: {
    kind: GuestActionKind | 'mixed';
    jobDescription?: string;
    generatedProposal?: string;
    cvText?: string;
  };
  compact?: boolean;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.7h5.2c-.2 1.2-1.4 3.6-5.2 3.6-3.1 0-5.7-2.6-5.7-5.7S8.9 6.1 12 6.1c1.8 0 3 .8 3.7 1.4l2.5-2.5C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.9 9.1-9.3 0-.6 0-1.1-.1-1.8H12z" />
      <path fill="#4285F4" d="M21.1 12c0-.6 0-1.1-.1-1.8H12v3.7h5.2c-.2 1.2-1.4 3.6-5.2 3.6-2.1 0-3.9-1.1-4.8-2.8l-3 2.3c1.7 3.4 5.2 5.7 9 5.7 5.5 0 9.1-3.9 9.1-9.3z" opacity=".9" />
      <path fill="#FBBC05" d="M7.2 14.8A5.6 5.6 0 0 1 6.9 12c0-1 0-1.9.3-2.8L4.2 6.9A9.3 9.3 0 0 0 2.7 12c0 1.5.4 2.9 1.5 4.1l3-1.3z" />
      <path fill="#34A853" d="M12 6.1c1.8 0 3 .8 3.7 1.4l2.5-2.5C16.7 3.6 14.6 2.7 12 2.7 8.2 2.7 4.9 4.9 3.2 8.1l3 2.3C7.1 8 9.1 6.1 12 6.1z" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

export function SocialAuthButtons({ redirectPath, draft, compact }: SocialAuthButtonsProps) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  const run = async (provider: SocialProvider) => {
    setBusy(provider);
    const { error } = await startSocialLogin(provider, { redirectPath, draft });
    if (error) {
      toast.error(error);
      setBusy(null);
    }
  };

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-2.5'}>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => void run('google')}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-70"
      >
        <GoogleMark />
        {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => void run('linkedin_oidc')}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[#0A66C2]/40 bg-[#0A66C2] text-sm font-semibold text-white hover:bg-[#0A66C2]/90 disabled:opacity-70"
      >
        <LinkedInMark />
        {busy === 'linkedin_oidc' ? 'Connecting…' : 'Continue with LinkedIn'}
      </button>
    </div>
  );
}
