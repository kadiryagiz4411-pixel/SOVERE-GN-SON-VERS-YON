/**
 * ProtectedRoute — guards authenticated routes.
 *
 * Fix over previous version:
 * - Uses `getSession()` as the primary source-of-truth (single async call).
 * - `onAuthStateChange` only handles *subsequent* changes (TOKEN_REFRESHED,
 *   SIGNED_OUT, etc.) — it no longer drives the initial loading state, which
 *   eliminates the race condition that caused an infinite blank screen.
 * - The loading state is *always* cleared in a `finally` block so no code path
 *   can leave the app stuck on the spinner.
 */
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading]           = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  // Guard against calling setState after unmount
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // ── Primary: one-shot session check ────────────────────────────────────
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted.current) {
          setAuthenticated(!!session);
        }
      } catch {
        if (mounted.current) setAuthenticated(false);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    init();

    // ── Secondary: react to auth events after the initial check ────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Only update auth state; never toggle `loading` here to avoid flicker
        if (mounted.current) {
          setAuthenticated(!!session);
        }
      },
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  return <>{children}</>;
};
