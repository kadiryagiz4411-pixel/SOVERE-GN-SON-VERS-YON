import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { useSession } from '@/contexts/SessionContext';
import {
  GUEST_ACTION_LIMIT,
  GUEST_GATE_EVENT,
  guestActionsRemaining,
  readGuestDraft,
  stashGuestDraft,
  type GuestActionKind,
} from '@/lib/guestMode';

interface SovereignGateModalProps {
  jobDescription?: string;
  generatedProposal?: string;
  cvText?: string;
}

export function SovereignGateModal({
  jobDescription,
  generatedProposal,
  cvText,
}: SovereignGateModalProps) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GuestActionKind>('proposal');

  useEffect(() => {
    const onGate = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: GuestActionKind }>).detail;
      if (detail?.kind) setKind(detail.kind);
      const existing = readGuestDraft();
      stashGuestDraft({
        kind: detail?.kind || existing?.kind || 'proposal',
        path: `${window.location.pathname}${window.location.search}`,
        jobDescription: jobDescription || existing?.jobDescription,
        generatedProposal: generatedProposal || existing?.generatedProposal,
        cvText: cvText || existing?.cvText,
      });
      setOpen(true);
    };
    window.addEventListener(GUEST_GATE_EVENT, onGate);
    return () => window.removeEventListener(GUEST_GATE_EVENT, onGate);
  }, [jobDescription, generatedProposal, cvText]);

  useEffect(() => {
    if (user) setOpen(false);
  }, [user]);

  if (!open) return null;
  const remaining = guestActionsRemaining();
  const draft = readGuestDraft();
  const paidAsGuest = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('payment') === 'success';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sovereign-gate-title">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-amber-400/25 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
          Sovereign Gate
        </div>
        <h2 id="sovereign-gate-title" className="text-2xl font-bold text-slate-50">
          {paidAsGuest
            ? 'Sign in to activate your $1.99 pass'
            : `You just used your ${GUEST_ACTION_LIMIT} free generations`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {paidAsGuest
            ? 'Use the same email you paid with so the Single Pass binds to this account instantly. Your draft stays on this device.'
            : `Sign in to keep this ${kind === 'cv' ? 'CV' : 'proposal'} and keep generating. Your draft stays on this device. Nothing is lost.`}
        </p>
        {remaining <= 0 && (
          <p className="mt-3 text-xs text-amber-200/80">
            Free guest limit reached{draft?.jobDescription ? ' · draft saved' : ''}.
          </p>
        )}
        <div className="mt-6">
          <SocialAuthButtons
            redirectPath={window.location.pathname}
            draft={{
              kind,
              jobDescription: jobDescription || draft?.jobDescription,
              generatedProposal: generatedProposal || draft?.generatedProposal,
              cvText: cvText || draft?.cvText,
            }}
          />
        </div>
        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <Link
          to="/auth?mode=signup"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-slate-200 hover:bg-white/5"
          onClick={() => setOpen(false)}
        >
          Continue with email
        </Link>
        <button
          type="button"
          className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300"
          onClick={() => setOpen(false)}
        >
          Keep reading this draft
        </button>
      </div>
    </div>
  );
}
