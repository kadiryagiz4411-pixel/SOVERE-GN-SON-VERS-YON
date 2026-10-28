import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';

const REDIRECT_DELAY = 5; // seconds before auto-redirect

const NotFound = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user }  = useSession();
  const [secs, setSecs] = useState(REDIRECT_DELAY);

  useEffect(() => {
    console.warn('[Sovereign] 404 — no route matched:', location.pathname);
  }, [location.pathname]);

  // Auto-redirect countdown
  useEffect(() => {
    if (secs <= 0) {
      navigate(user ? '/dashboard' : '/', { replace: true });
      return;
    }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs, navigate, user]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-9 h-9 text-amber-400" />
      </div>

      {/* Heading */}
      <h1 className="text-6xl font-bold text-foreground mb-3">404</h1>
      <p className="text-xl font-medium text-foreground mb-2">Page not found</p>
      <p className="text-muted-foreground text-sm mb-1 max-w-sm">
        The page{' '}
        <code className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-xs font-mono">
          {location.pathname}
        </code>{' '}
        doesn&apos;t exist.
      </p>
      <p className="text-muted-foreground/60 text-xs mb-8">
        Redirecting to {user ? 'dashboard' : 'home'} in {secs}s…
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="gold"
          onClick={() => navigate(user ? '/dashboard' : '/', { replace: true })}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          {user ? 'Go to Dashboard' : 'Go to Home'}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
