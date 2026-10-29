/**
 * ProtectedRoute — auth guard + onboarding gate.
 *
 * Redirects run only after the session and the first onboarding read have settled.
 * While either is still loading, a skeleton is shown so the guard cannot bounce
 * between /onboarding and /dashboard.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function lsOnboardingDone(): boolean {
  try {
    return localStorage.getItem('sovereign_onboarding_done') === 'true';
  } catch {
    return false;
  }
}

function RouteSkeleton() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, sessionReady, onboardingCompleted, onboardingResolved } = useSession();
  const location = useLocation();

  if (!sessionReady || (Boolean(user) && !onboardingResolved)) {
    return <RouteSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const alreadyDone = lsOnboardingDone() || onboardingCompleted;
  const onOnboardingPage = location.pathname === '/onboarding';

  if (!alreadyDone && !onOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  if (alreadyDone && onOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
