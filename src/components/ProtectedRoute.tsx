/**
 * ProtectedRoute — auth guard + mandatory onboarding gate.
 *
 * 1. While session is loading  → spinner (avoids flash-of-unauthenticated-content).
 * 2. No user                   → redirect to /auth (sign-in).
 * 3. User present but onboarding_completed is explicitly false (new signup)
 *    AND we are NOT already on /onboarding → redirect to /onboarding.
 * 4. All checks pass           → render children.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, sessionReady, onboardingCompleted } = useSession();
  const location = useLocation();

  // Wait for Supabase to resolve the cached/live session.
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in → send to auth (sign-in by default, not sign-up).
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Mandatory onboarding gate — only fires when DB has onboarding_completed=false.
  // We skip the check when already on /onboarding to prevent an infinite redirect loop.
  const onOnboardingPage = location.pathname === '/onboarding';
  if (!onboardingCompleted && !onOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
