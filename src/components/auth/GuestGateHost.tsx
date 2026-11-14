import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { SovereignGateModal } from '@/components/auth/SovereignGateModal';
import { clearGuestDraft, openGuestGate, readGuestDraft } from '@/lib/guestMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Global Sovereign Gate + restores guest drafts after Google/LinkedIn login. */
export function GuestGateHost() {
  const { user, sessionReady } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (!sessionReady || user) return;
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      openGuestGate({ kind: 'proposal' });
    }
  }, [sessionReady, user, location.search]);

  useEffect(() => {
    if (!sessionReady || !user) return;
    let cancelled = false;
    const run = async () => {
      try {
        await supabase.rpc('claim_pending_pass_grants', {
          user_id_input: user.id,
          email_input: user.email || null,
        });
      } catch {
        /* RPC may not exist until migration is applied */
      }
      if (cancelled) return;
      const draft = readGuestDraft();
      if (!draft) return;
      const age = Date.now() - (draft.at || 0);
      if (age > 6 * 60 * 60 * 1000) {
        clearGuestDraft();
        return;
      }
      toast.success('Welcome back — your draft is still here.', { duration: 5000 });
      window.dispatchEvent(new CustomEvent('sovereign:restore-guest-draft', { detail: draft }));
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, user, location.pathname]);

  return <SovereignGateModal />;
}
