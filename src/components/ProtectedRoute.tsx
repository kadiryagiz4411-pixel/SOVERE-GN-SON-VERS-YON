/**
 * ProtectedRoute — auth guard + mandatory onboarding gate.
 *
 * Gate priority (first matching rule wins):
 *  1. sessionReady=false            → spinner
 *  2. no user                       → /auth
 *  3. localStorage 'sovereign_onboarding_done'==='true'  → pass (no DB round-trip needed)
 *  4. onboardingCompleted===true in SessionContext        → pass
 *  5. already on /onboarding                             → pass (prevents loop)
 *  6. onboardingCompleted===false                        → /onboarding
 *  7. else                                               → pass (null = existing user)
 */
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/** Reads the localStorage flag without throwing in SSR or restricted environments. */
function lsOnboardingDone(): boolean {
  try {
    return localStorage.getItem('sovereign_onboarding_done') === 'true';
  } catch {
    return false;
  }
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, sessionReady, onboardingCompleted } = useSession();
  const location = useLocation();

  // 1. Wait for Supabase session to resolve.
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Not logged in → sign-in.
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3 & 4. Check both the fast localStorage flag AND the context state.
  //        Either being truthy is sufficient to skip the onboarding gate.
  const alreadyDone = lsOnboardingDone() || onboardingCompleted;

  // 5. Never redirect from /onboarding back to /onboarding (loop prevention).
  const onOnboardingPage = location.pathname === '/onboarding';

  // 6. Gate fires only when DB explicitly has false AND neither fast-path passed.
  if (!alreadyDone && !onOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user somehow lands on /onboarding but is already done, send to dashboard.
  if (alreadyDone && onOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
