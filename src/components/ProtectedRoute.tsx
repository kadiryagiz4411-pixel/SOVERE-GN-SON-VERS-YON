/**
 * ProtectedRoute — uses the cached SessionContext.
 * Does not call getSession() on every protected-route remount.
 */
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, sessionReady } = useSession();

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  return <>{children}</>;
};
