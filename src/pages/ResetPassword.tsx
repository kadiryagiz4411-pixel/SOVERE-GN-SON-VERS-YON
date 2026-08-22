/**
 * ResetPassword.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles two Supabase recovery flows:
 *   1. PKCE  → URL contains `?code=…`           (new default)
 *   2. Legacy → URL contains `?token_hash=…&type=recovery` or `#access_token=…`
 *
 * Key fixes in this version:
 * - Shell component hoisted to MODULE level → no focus loss on keystroke.
 * - Native <input> elements with explicit font-size/font-family so password
 *   masking dots are crisp and correctly sized (no weird inflate).
 * - All UI strings are hardcoded English for clean Google Translate detection.
 * - onAuthStateChange subscribed FIRST to never miss PASSWORD_RECOVERY.
 * - `settled` ref prevents the two async paths from racing.
 * - `isMounted` ref guards every setState call.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Crown, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck,
  AlertTriangle, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Password strength (module-level, pure) ───────────────────────────────────

type Strength = 0 | 1 | 2 | 3 | 4;

function measureStrength(pw: string): Strength {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score) as Strength;
}

const STRENGTH_BAR_COLOR: Record<Strength, string> = {
  0: '',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-yellow-400',
  4: 'bg-emerald-500',
};

const STRENGTH_TEXT_COLOR: Record<Strength, string> = {
  0: '',
  1: 'text-red-500',
  2: 'text-amber-500',
  3: 'text-yellow-400',
  4: 'text-emerald-500',
};

const STRENGTH_LABEL: Record<Strength, string> = {
  0: '', 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong',
};

// ─── Shell — HOISTED outside component to prevent focus loss ─────────────────
// IMPORTANT: defining this inside the component body would cause React to treat
// it as a new component type on every render, unmounting the form and clearing
// focus on every keystroke. It must live at module scope.

interface ShellProps {
  onBack: () => void;
  children: React.ReactNode;
}

function Shell({ onBack, children }: ShellProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
            <Crown className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Sovereign</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Password input — module-level styled component ───────────────────────────
// Uses a native <input> with explicit text-base + system-ui font so browser
// password-masking dots render at the correct small size without inflation from
// custom typefaces or letter-spacing rules.

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}

function PasswordInput({
  id, value, onChange, show, onToggleShow,
  placeholder = '••••••••', className = '', autoComplete = 'current-password',
}: PasswordInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={false}
        required
        style={{
          /* Explicit font stack prevents custom typeface from inflating dots */
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
          letterSpacing: 'normal',
        }}
        className={cn(
          'w-full h-12 rounded-md border border-input bg-background px-3 pr-12',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'transition-colors',
          className,
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}

// ─── Page state type ───────────────────────────────────────────────────────────

type PageState = 'checking' | 'ready' | 'invalid' | 'success';

// ─── Main component ───────────────────────────────────────────────────────────

const ResetPassword = () => {
  const navigate = useNavigate();

  const [pageState, setPageState]             = useState<PageState>('checking');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);

  const isMounted = useRef(true);
  const settled   = useRef(false);

  const strength      = useMemo(() => measureStrength(password), [password]);
  const strengthLabel = STRENGTH_LABEL[strength];

  const settle = (state: PageState) => {
    if (!isMounted.current || settled.current) return;
    settled.current = true;
    setPageState(state);
  };

  const clearUrlParams = () =>
    window.history.replaceState({}, document.title, '/reset-password');

  // ── Token verification ───────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    settled.current   = false;

    // Subscribe FIRST — never miss PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearUrlParams();
        settle('ready');
      }
    });

    const initCheck = async () => {
      const search    = new URLSearchParams(window.location.search);
      const hashStr   = window.location.hash.replace(/^#/, '');
      const hash      = new URLSearchParams(hashStr);

      const type        = search.get('type')         ?? hash.get('type');
      const tokenHash   = search.get('token_hash')   ?? hash.get('token_hash');
      const code        = search.get('code')         ?? hash.get('code');
      const accessToken = search.get('access_token') ?? hash.get('access_token');

      const hasRecoveryCtx =
        type === 'recovery' || Boolean(tokenHash || code || accessToken);

      try {
        // PKCE flow — exchange code for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) { settle('invalid'); return; }
          clearUrlParams();
          settle('ready');
          return;
        }

        // Legacy OTP flow — verify token_hash
        if (type === 'recovery' && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });
          if (error) { settle('invalid'); return; }
          clearUrlParams();
          settle('ready');
          return;
        }

        // Hash-fragment flow — wait briefly for the auth event
        if (accessToken && hasRecoveryCtx) {
          await new Promise(r => setTimeout(r, 400));
          if (settled.current) return;
        }

        // Last resort — check for an existing recovery session
        const { data: { session } } = await supabase.auth.getSession();
        if (session && hasRecoveryCtx) {
          clearUrlParams();
          settle('ready');
          return;
        }

        settle('invalid');
      } catch {
        settle('invalid');
      }
    };

    initCheck();

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        const detail = (error as any).status ? ` [${(error as any).status}]` : '';
        toast.error(`${error.message}${detail}`, { duration: 8000 });
        return;
      }

      await supabase.auth.signOut();
      toast.success('Password updated successfully! Redirecting to sign in…', { duration: 3000 });
      if (isMounted.current) setPageState('success');

      setTimeout(() => {
        if (isMounted.current) navigate('/auth');
      }, 3200);
    } catch (err) {
      console.error('[ResetPassword] updateUser error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const goBack = () => navigate('/auth');

  // ── Spinner while verifying token ────────────────────────────────────────────

  if (pageState === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <Shell onBack={goBack}>
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Password Updated!</h1>
            <p className="text-muted-foreground text-sm">
              Your password has been changed. Sign in with your new password.
            </p>
          </div>
          <Button variant="gold" className="w-full h-12" onClick={goBack}>
            Go to Sign In
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Invalid / expired link ───────────────────────────────────────────────────

  if (pageState === 'invalid') {
    return (
      <Shell onBack={goBack}>
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Reset Link Invalid or Expired
            </h1>
            <p className="text-muted-foreground text-sm">
              Request a fresh link from the sign-in page.
            </p>
          </div>
          <Button
            variant="gold"
            className="w-full h-12"
            onClick={() => navigate('/auth?mode=forgot')}
          >
            Request New Link
          </Button>
          <button
            type="button"
            onClick={goBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
          >
            Go to Sign In
          </button>
        </div>
      </Shell>
    );
  }

  // ── Password update form ─────────────────────────────────────────────────────

  return (
    <Shell onBack={goBack}>
      <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Enter and confirm your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* New Password */}
        <div className="space-y-2">
          <label
            htmlFor="pw"
            className="text-sm font-medium text-foreground block"
          >
            New Password
          </label>

          <PasswordInput
            id="pw"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword(p => !p)}
            placeholder="Enter new password"
            autoComplete="new-password"
          />

          {/* Strength bar */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {([1, 2, 3, 4] as Strength[]).map(i => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      strength >= i ? STRENGTH_BAR_COLOR[strength] : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              {strengthLabel && (
                <p className={cn('text-xs font-medium', STRENGTH_TEXT_COLOR[strength])}>
                  {strengthLabel}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label
            htmlFor="confirm"
            className="text-sm font-medium text-foreground block"
          >
            Confirm New Password
          </label>

          <PasswordInput
            id="confirm"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(p => !p)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className={
              confirmPassword
                ? confirmPassword !== password
                  ? 'border-red-500/60 focus:ring-red-500/40'
                  : 'border-emerald-500/60 focus:ring-emerald-500/40'
                : ''
            }
          />

          {confirmPassword && confirmPassword !== password && (
            <p className="text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="gold"
          className="w-full h-12"
          disabled={isLoading || (!!confirmPassword && confirmPassword !== password)}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating password…
            </>
          ) : (
            'Update Password'
          )}
        </Button>
      </form>

      {/* Trust line */}
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" />
        Password is encrypted end-to-end by Supabase.
      </div>
    </Shell>
  );
};

export default ResetPassword;
