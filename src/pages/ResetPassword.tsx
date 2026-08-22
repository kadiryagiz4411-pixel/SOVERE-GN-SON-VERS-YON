/**
 * ResetPassword.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles two Supabase recovery flows:
 *   1. PKCE  → URL contains `?code=…`           (new default)
 *   2. Legacy → URL contains `?token_hash=…&type=recovery` or `#access_token=…`
 *
 * Fix summary vs previous version:
 * - onAuthStateChange subscriber is created FIRST so PASSWORD_RECOVERY is
 *   never missed regardless of how fast initCheck resolves.
 * - A `settled` ref prevents the two async paths from overwriting each other.
 * - Operator-precedence bug in the session fallback condition fixed.
 * - Password strength indicator added.
 * - Both fields now have independent show/hide toggles.
 * - Min password length raised to 8.
 * - All state setters are guarded by an `isMounted` ref.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Crown, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck,
  AlertTriangle, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

// ─── i18n ─────────────────────────────────────────────────────────────────────

const COPY = {
  en: {
    title: 'Set New Password',
    subtitle: 'Enter and confirm your new password below.',
    password: 'New Password',
    confirm: 'Confirm New Password',
    submit: 'Update Password',
    updating: 'Updating…',
    successTitle: 'Password Updated!',
    successDesc: 'Your password has been changed. Sign in with your new password.',
    goToLogin: 'Go to Sign In',
    invalid: 'This reset link is invalid or has expired.',
    expired: 'Request a fresh link from the sign-in page.',
    requestNew: 'Request New Link',
    mismatch: 'Passwords do not match.',
    tooShort: 'Password must be at least 8 characters.',
    strengthWeak: 'Weak',
    strengthFair: 'Fair',
    strengthGood: 'Good',
    strengthStrong: 'Strong',
  },
  tr: {
    title: 'Yeni Şifre Belirle',
    subtitle: 'Aşağıya yeni şifrenizi girin ve onaylayın.',
    password: 'Yeni Şifre',
    confirm: 'Yeni Şifreyi Onayla',
    submit: 'Şifreyi Güncelle',
    updating: 'Güncelleniyor…',
    successTitle: 'Şifre Güncellendi!',
    successDesc: 'Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.',
    goToLogin: 'Giriş Yap',
    invalid: 'Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
    expired: 'Giriş sayfasından yeni bir bağlantı talep edin.',
    requestNew: 'Yeni Bağlantı İste',
    mismatch: 'Şifreler eşleşmiyor.',
    tooShort: 'Şifre en az 8 karakter olmalıdır.',
    strengthWeak: 'Zayıf',
    strengthFair: 'Orta',
    strengthGood: 'İyi',
    strengthStrong: 'Güçlü',
  },
  de: {
    title: 'Neues Passwort festlegen',
    subtitle: 'Geben Sie Ihr neues Passwort ein und bestätigen Sie es.',
    password: 'Neues Passwort',
    confirm: 'Neues Passwort bestätigen',
    submit: 'Passwort aktualisieren',
    updating: 'Wird aktualisiert…',
    successTitle: 'Passwort aktualisiert!',
    successDesc: 'Ihr Passwort wurde erfolgreich geändert.',
    goToLogin: 'Zur Anmeldung',
    invalid: 'Dieser Reset-Link ist ungültig oder abgelaufen.',
    expired: 'Fordern Sie einen neuen Link auf der Anmeldeseite an.',
    requestNew: 'Neuen Link anfordern',
    mismatch: 'Passwörter stimmen nicht überein.',
    tooShort: 'Passwort muss mindestens 8 Zeichen haben.',
    strengthWeak: 'Schwach',
    strengthFair: 'Mittel',
    strengthGood: 'Gut',
    strengthStrong: 'Stark',
  },
  fr: {
    title: 'Nouveau mot de passe',
    subtitle: 'Entrez et confirmez votre nouveau mot de passe.',
    password: 'Nouveau mot de passe',
    confirm: 'Confirmer le nouveau mot de passe',
    submit: 'Mettre à jour',
    updating: 'Mise à jour…',
    successTitle: 'Mot de passe mis à jour !',
    successDesc: 'Votre mot de passe a été changé avec succès.',
    goToLogin: 'Se connecter',
    invalid: 'Ce lien est invalide ou expiré.',
    expired: 'Demandez un nouveau lien sur la page de connexion.',
    requestNew: 'Demander un nouveau lien',
    mismatch: 'Les mots de passe ne correspondent pas.',
    tooShort: 'Le mot de passe doit avoir au moins 8 caractères.',
    strengthWeak: 'Faible',
    strengthFair: 'Moyen',
    strengthGood: 'Bon',
    strengthStrong: 'Fort',
  },
} as const;

// ─── Password strength ────────────────────────────────────────────────────────

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

const STRENGTH_COLOR: Record<Strength, string> = {
  0: '',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-yellow-400',
  4: 'bg-emerald-500',
};

// ─── Component ────────────────────────────────────────────────────────────────

type PageState = 'checking' | 'ready' | 'invalid' | 'success';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = COPY[(language as keyof typeof COPY)] ?? COPY.en;

  const [pageState, setPageState]         = useState<PageState>('checking');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [isLoading, setIsLoading]         = useState(false);

  const isMounted = useRef(true);
  /** Prevents two async paths from racing to set the page state */
  const settled   = useRef(false);

  const strength = useMemo(() => measureStrength(password), [password]);

  const strengthLabel = useMemo((): string => {
    const labels: Record<Strength, string> = {
      0: '', 1: l.strengthWeak, 2: l.strengthFair,
      3: l.strengthGood, 4: l.strengthStrong,
    };
    return labels[strength];
  }, [strength, l]);

  const settle = (state: PageState) => {
    if (!isMounted.current || settled.current) return;
    settled.current = true;
    setPageState(state);
  };

  const clearUrlParams = () => {
    window.history.replaceState({}, document.title, '/reset-password');
  };

  useEffect(() => {
    isMounted.current = true;
    settled.current   = false;

    // ── Step 1: Subscribe FIRST so we never miss PASSWORD_RECOVERY ──────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearUrlParams();
        settle('ready');
      }
    });

    // ── Step 2: Parse URL params and verify the token ───────────────────────
    const initCheck = async () => {
      const search    = new URLSearchParams(window.location.search);
      const hashStr   = window.location.hash.replace(/^#/, '');
      const hash      = new URLSearchParams(hashStr);

      const type        = search.get('type')        ?? hash.get('type');
      const tokenHash   = search.get('token_hash')  ?? hash.get('token_hash');
      const code        = search.get('code')        ?? hash.get('code');
      const accessToken = search.get('access_token') ?? hash.get('access_token');

      const hasRecoveryCtx =
        type === 'recovery' ||
        Boolean(tokenHash || code || accessToken);

      try {
        // ── PKCE flow: exchange code for session ──────────────────────────
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) { settle('invalid'); return; }
          clearUrlParams();
          settle('ready');
          return;
        }

        // ── Legacy OTP flow: verify token_hash ────────────────────────────
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

        // ── Hash-fragment flow: wait briefly for the auth event ───────────
        if (accessToken && hasRecoveryCtx) {
          await new Promise(r => setTimeout(r, 400));
          // If onAuthStateChange already settled us, do nothing
          if (settled.current) return;
        }

        // ── Last resort: check whether a recovery session already exists ──
        const { data: { session } } = await supabase.auth.getSession();
        if (session && hasRecoveryCtx) {
          clearUrlParams();
          settle('ready');
          return;
        }

        // No valid recovery context at all
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

  // ─── Form submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(l.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(l.mismatch);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // Surface the exact Supabase error so the user (and support) can see it
        const detail = (error as any).status ? ` [${(error as any).status}]` : '';
        toast.error(`${error.message}${detail}`, { duration: 8000 });
        return;
      }

      // Sign out so the user authenticates fresh with the new password
      await supabase.auth.signOut();

      toast.success('Password updated! Redirecting to sign in…', { duration: 3000 });
      if (isMounted.current) setPageState('success');

      // Auto-navigate after the toast is visible
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

  // ─── Shared page shell ─────────────────────────────────────────────────────

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/auth')}
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

  // ─── Checking (spinner) ────────────────────────────────────────────────────

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

  // ─── Success ───────────────────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <Shell>
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{l.successTitle}</h1>
            <p className="text-muted-foreground text-sm">{l.successDesc}</p>
          </div>
          <Button variant="gold" className="w-full h-12" onClick={() => navigate('/auth')}>
            {l.goToLogin}
          </Button>
        </div>
      </Shell>
    );
  }

  // ─── Invalid / expired ─────────────────────────────────────────────────────

  if (pageState === 'invalid') {
    return (
      <Shell>
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">{l.invalid}</h1>
            <p className="text-muted-foreground text-sm">{l.expired}</p>
          </div>
          <Button
            variant="gold"
            className="w-full h-12"
            onClick={() => navigate('/auth?mode=forgot')}
          >
            {l.requestNew}
          </Button>
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
          >
            {l.goToLogin}
          </button>
        </div>
      </Shell>
    );
  }

  // ─── Password update form ──────────────────────────────────────────────────

  return (
    <Shell>
      <h1 className="text-3xl font-bold text-foreground mb-2">{l.title}</h1>
      <p className="text-muted-foreground text-sm mb-8">{l.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New password */}
        <div className="space-y-2">
          <Label htmlFor="pw">{l.password}</Label>
          <div className="relative">
            <Input
              id="pw"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-12 pr-12"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      strength >= i ? STRENGTH_COLOR[strength] : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              {strengthLabel && (
                <p className={cn(
                  'text-xs font-medium',
                  strength <= 1 ? 'text-red-500'
                    : strength === 2 ? 'text-amber-500'
                    : strength === 3 ? 'text-yellow-400'
                    : 'text-emerald-500',
                )}>
                  {strengthLabel}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirm">{l.confirm}</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={cn(
                'h-12 pr-12',
                confirmPassword && confirmPassword !== password
                  ? 'border-red-500/60 focus-visible:ring-red-500/20'
                  : confirmPassword && confirmPassword === password
                    ? 'border-emerald-500/60 focus-visible:ring-emerald-500/20'
                    : '',
              )}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-xs text-red-500">{l.mismatch}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gold"
          className="w-full h-12"
          disabled={isLoading || (!!confirmPassword && confirmPassword !== password)}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {l.updating}
            </>
          ) : l.submit}
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
