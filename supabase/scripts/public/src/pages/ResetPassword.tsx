import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  const txt = {
    en: {
      title: 'Set New Password',
      subtitle: 'Enter your new password below',
      password: 'New Password',
      confirm: 'Confirm New Password',
      submit: 'Update Password',
      successTitle: 'Password Updated!',
      successDesc: 'Your password has been changed successfully. You can now sign in with your new password.',
      goToLogin: 'Go to Sign In',
      invalid: 'Invalid or expired reset link. Please request a new one.',
      requestNew: 'Request new link',
    },
    tr: {
      title: 'Yeni Şifre Belirle',
      subtitle: 'Aşağıya yeni şifrenizi girin',
      password: 'Yeni Şifre',
      confirm: 'Yeni Şifreyi Onayla',
      submit: 'Şifreyi Güncelle',
      successTitle: 'Şifre Güncellendi!',
      successDesc: 'Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.',
      goToLogin: 'Giriş Yap',
      invalid: 'Geçersiz veya süresi dolmuş bağlantı. Lütfen yeni bir tane isteyin.',
      requestNew: 'Yeni bağlantı iste',
    },
    de: {
      title: 'Neues Passwort festlegen',
      subtitle: 'Geben Sie Ihr neues Passwort ein',
      password: 'Neues Passwort',
      confirm: 'Neues Passwort bestätigen',
      submit: 'Passwort aktualisieren',
      successTitle: 'Passwort aktualisiert!',
      successDesc: 'Ihr Passwort wurde erfolgreich geändert.',
      goToLogin: 'Zur Anmeldung',
      invalid: 'Ungültiger oder abgelaufener Link.',
      requestNew: 'Neuen Link anfordern',
    },
    fr: {
      title: 'Nouveau mot de passe',
      subtitle: 'Entrez votre nouveau mot de passe',
      password: 'Nouveau mot de passe',
      confirm: 'Confirmer le nouveau mot de passe',
      submit: 'Mettre à jour',
      successTitle: 'Mot de passe mis à jour !',
      successDesc: 'Votre mot de passe a été changé avec succès.',
      goToLogin: 'Se connecter',
      invalid: 'Lien invalide ou expiré.',
      requestNew: 'Demander un nouveau lien',
    },
  };

  const l = txt[language as keyof typeof txt] || txt.en;

  const clearRecoveryParamsFromUrl = () => {
    window.history.replaceState({}, document.title, '/reset-password');
  };

  const hasRecoveryIndicators = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const type = searchParams.get('type') ?? hashParams.get('type');

    return (
      type === 'recovery' ||
      searchParams.has('token_hash') ||
      searchParams.has('code') ||
      hashParams.has('token_hash') ||
      hashParams.has('access_token')
    );
  };

  useEffect(() => {
    let isMounted = true;

    const setReadyState = (ready: boolean) => {
      if (!isMounted) return;
      setIsReady(ready);
      setChecking(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
        setChecking(false);
        clearRecoveryParamsFromUrl();
      }
    });

    const initCheck = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const type = searchParams.get('type') ?? hashParams.get('type');
      const tokenHash = searchParams.get('token_hash') ?? hashParams.get('token_hash');
      const code = searchParams.get('code') ?? hashParams.get('code');
      const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token');

      const hasRecoveryContext = type === 'recovery' || Boolean(tokenHash || code || accessToken);

      try {
        if (type === 'recovery' && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });

          if (error) {
            setReadyState(false);
            return;
          }

          clearRecoveryParamsFromUrl();
          setReadyState(true);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            setReadyState(false);
            return;
          }

          clearRecoveryParamsFromUrl();
          setReadyState(true);
          return;
        }

        if (accessToken && hasRecoveryContext) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session && (hasRecoveryContext || !window.location.search && !window.location.hash)) {
          if (hasRecoveryIndicators()) {
            clearRecoveryParamsFromUrl();
          }
          setReadyState(true);
          return;
        }

        setReadyState(false);
      } catch {
        setReadyState(false);
      }
    };

    initCheck();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error(language === 'tr' ? 'Şifre en az 6 karakter olmalı' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error(language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        // Sign out so user logs in fresh with new password
        await supabase.auth.signOut();
        setSuccess(true);
        toast.success(l.successTitle);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">{l.successTitle}</h1>
          <p className="text-muted-foreground mb-6">{l.successDesc}</p>
          <Button variant="gold" className="w-full h-12" onClick={() => navigate('/auth')}>
            {l.goToLogin}
          </Button>
        </div>
      </div>
    );
  }

  // Invalid/expired link
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold mx-auto mb-6">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">{l.invalid}</h1>
          <Button variant="gold" className="mt-4 h-12 w-full" onClick={() => navigate('/auth?mode=forgot')}>
            {l.requestNew}
          </Button>
          <button
            onClick={() => navigate('/auth')}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
          >
            {l.goToLogin}
          </button>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
            <Crown className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Sovereign</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{l.title}</h1>
        <p className="text-muted-foreground mb-8">{l.subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>{l.password}</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{l.confirm}</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" variant="gold" className="w-full h-12" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'tr' ? 'Güncelleniyor...' : 'Updating...'}
              </>
            ) : l.submit}
          </Button>
        </form>

        <button
          onClick={() => navigate('/auth')}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
        >
          {l.goToLogin}
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
