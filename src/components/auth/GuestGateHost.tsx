import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { SovereignGateModal } from '@/components/auth/SovereignGateModal';
import { clearGuestDraft, readGuestDraft } from '@/lib/guestMode';
import { toast } from 'sonner';

/** Global Sovereign Gate + restores guest drafts after Google/LinkedIn login. */
export function GuestGateHost() {
  const { user, sessionReady } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (!sessionReady || !user) return;
    const draft = readGuestDraft();
    if (!draft) return;
    const age = Date.now() - (draft.at || 0);
    if (age > 6 * 60 * 60 * 1000) {
      clearGuestDraft();
      return;
    }
    toast.success('Welcome back — your draft is still here.', { duration: 5000 });
    window.dispatchEvent(new CustomEvent('sovereign:restore-guest-draft', { detail: draft }));
  }, [sessionReady, user, location.pathname]);

  return <SovereignGateModal />;
}
