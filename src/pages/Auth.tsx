import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { Crown, Eye, EyeOff, ArrowLeft, Loader2, Mail, KeyRound, UserPlus, LogIn, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'signin' | 'signup' | 'forgot-password';

const Auth = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paramMode = searchParams.get('mode');
  const [mode, setMode] = useState<AuthMode>(paramMode === 'signup' ? 'signup' : 'signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const txt = {
    en: {
      signInTitle: 'Welcome Back',
      signInSubtitle: 'Sign in to your account to continue',
      signUpTitle: 'Create Your Account',
      signUpSubtitle: 'Join Sovereign and start winning proposals',
      forgotTitle: 'Reset Your Password',
      forgotSubtitle: 'Enter your email and we\'ll send you a reset link',
      fullName: 'Full Name',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      signIn: 'Sign In',
      signUp: 'Create Account',
      sendReset: 'Send Reset Link',
      forgotPassword: 'Forgot password?',
      noAccount: 'Don\'t have an account?',
      hasAccount: 'Already have an account?',
      backToSignIn: 'Back to Sign In',
      resetSent: 'Reset link sent!',
      resetSentDesc: 'Check your email for a password reset link.',
      emailConfirmTitle: 'Check Your Email',
      emailConfirmDesc: 'We sent a confirmation link to',
      emailConfirmHint: 'Check your spam folder if you don\'t see it.',
      goToSignIn: 'Go to Sign In',
      tryDifferentEmail: 'Try a different email',
      termsAgree: 'By creating an account, you agree to our',
      terms: 'Terms of Service',
      and: 'and',
      privacy: 'Privacy Policy',
    },
    tr: {
      signInTitle: 'Tekrar Hoş Geldiniz',
      signInSubtitle: 'Devam etmek için hesabınıza giriş yapın',
      signUpTitle: 'Hesabınızı Oluşturun',
      signUpSubtitle: 'Sovereign\'e katılın ve kazanan teklifler oluşturun',
      forgotTitle: 'Şifrenizi Sıfırlayın',
      forgotSubtitle: 'E-postanızı girin, size sıfırlama bağlantısı gönderelim',
      fullName: 'Ad Soyad',
      email: 'E-posta Adresi',
      password: 'Şifre',
      confirmPassword: 'Şifreyi Onayla',
      signIn: 'Giriş Yap',
      signUp: 'Hesap Oluştur',
      sendReset: 'Sıfırlama Bağlantısı Gönder',
      forgotPassword: 'Şifremi unuttum',
      noAccount: 'Hesabınız yok mu?',
      hasAccount: 'Zaten hesabınız var mı?',
      backToSignIn: 'Giriş Sayfasına Dön',
      resetSent: 'Sıfırlama bağlantısı gönderildi!',
      resetSentDesc: 'Şifre sıfırlama bağlantısı için e-postanızı kontrol edin.',
      emailConfirmTitle: 'E-postanızı Kontrol Edin',
      emailConfirmDesc: 'Onay bağlantısı gönderildi:',
      emailConfirmHint: 'Görünmüyorsa spam klasörünü kontrol edin.',
      goToSignIn: 'Giriş Sayfasına Git',
      tryDifferentEmail: 'Farklı bir e-posta dene',
      termsAgree: 'Hesap oluşturarak şunları kabul edersiniz:',
      terms: 'Kullanım Şartları',
      and: 've',
      privacy: 'Gizlilik Politikası',
    },
    de: {
      signInTitle: 'Willkommen zurück',
      signInSubtitle: 'Melden Sie sich an, um fortzufahren',
      signUpTitle: 'Konto erstellen',
      signUpSubtitle: 'Treten Sie Sovereign bei',
      forgotTitle: 'Passwort zurücksetzen',
      forgotSubtitle: 'Geben Sie Ihre E-Mail ein, wir senden einen Reset-Link',
      fullName: 'Vollständiger Name',
      email: 'E-Mail-Adresse',
      password: 'Passwort',
      confirmPassword: 'Passwort bestätigen',
      signIn: 'Anmelden',
      signUp: 'Konto erstellen',
      sendReset: 'Reset-Link senden',
      forgotPassword: 'Passwort vergessen?',
      noAccount: 'Noch kein Konto?',
      hasAccount: 'Bereits ein Konto?',
      backToSignIn: 'Zurück zur Anmeldung',
      resetSent: 'Reset-Link gesendet!',
      resetSentDesc: 'Prüfen Sie Ihre E-Mail für den Reset-Link.',
      emailConfirmTitle: 'E-Mail prüfen',
      emailConfirmDesc: 'Bestätigungslink gesendet an',
      emailConfirmHint: 'Prüfen Sie den Spam-Ordner.',
      goToSignIn: 'Zur Anmeldung',
      tryDifferentEmail: 'Andere E-Mail verwenden',
      termsAgree: 'Mit der Erstellung stimmen Sie zu:',
      terms: 'Nutzungsbedingungen',
      and: 'und',
      privacy: 'Datenschutz',
    },
    fr: {
      signInTitle: 'Bon retour',
      signInSubtitle: 'Connectez-vous pour continuer',
      signUpTitle: 'Créer un compte',
      signUpSubtitle: 'Rejoignez Sovereign',
      forgotTitle: 'Réinitialiser le mot de passe',
      forgotSubtitle: 'Entrez votre email, nous enverrons un lien',
      fullName: 'Nom complet',
      email: 'Adresse email',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      signIn: 'Se connecter',
      signUp: 'Créer un compte',
      sendReset: 'Envoyer le lien',
      forgotPassword: 'Mot de passe oublié ?',
      noAccount: 'Pas de compte ?',
      hasAccount: 'Déjà un compte ?',
      backToSignIn: 'Retour à la connexion',
      resetSent: 'Lien envoyé !',
      resetSentDesc: 'Vérifiez votre email.',
      emailConfirmTitle: 'Vérifiez votre email',
      emailConfirmDesc: 'Lien de confirmation envoyé à',
      emailConfirmHint: 'Vérifiez le dossier spam.',
      goToSignIn: 'Aller à la connexion',
      tryDifferentEmail: 'Essayer un autre email',
      termsAgree: 'En créant un compte, vous acceptez nos',
      terms: 'Conditions',
      and: 'et',
      privacy: 'Politique de confidentialité',
    },
  };

  const l = txt[language] || txt.en;

  const getRecoveryRedirectPath = () => {
    const { search, hash } = window.location;
    return `/reset-password${search}${hash}`;
  };

  /**
   * Returns the absolute URL Supabase will redirect back to after the user
   * clicks the reset-password email link.
   *
   * On sovereignapp.pro (production) → always use the canonical domain so
   * Supabase's "Allowed Redirect URLs" list is satisfied.
   * On any other origin (localhost, Vercel preview) → use the current origin
   * so local testing continues to work without editing the allow-list.
   */
  const getResetRedirectUrl = (): string =>
    window.location.origin.includes('sovereignapp.pro')
      ? 'https://sovereignapp.pro/reset-password'
      : `${window.location.origin}/reset-password`;

  const hasRecoveryParams = () => {
    const hash = window.location.hash;
    const search = new URLSearchParams(window.location.search);

    return (
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      search.get('type') === 'recovery' ||
      search.has('token_hash') ||
      search.has('access_token') ||
      search.has('code')
    );
  };

  useEffect(() => {
    const checkSession = async () => {
      if (hasRecoveryParams()) {
        navigate(getRecoveryRedirectPath(), { replace: true });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || hasRecoveryParams()) {
        navigate(getRecoveryRedirectPath(), { replace: true });
        return;
      }

      if (event === 'SIGNED_IN' && session && mode !== 'signup') {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, mode]);

  // Start 60-second resend cooldown whenever the reset email is first sent
  useEffect(() => {
    if (!resetEmailSent) return;
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [resetEmailSent]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !formData.email) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        formData.email.trim().toLowerCase(),
        { redirectTo: getResetRedirectUrl() },
      );
      if (error) {
        const detail = (error as any).status ? ` [${(error as any).status}]` : '';
        toast.error(`${error.message}${detail}`, { duration: 8000 });
      } else {
        toast.success('Password reset link sent! Check your inbox and spam folder.');
        setResendCooldown(60);
        cooldownRef.current = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch { toast.error('Failed to resend. Please try again.'); }
    finally { setIsLoading(false); }
  }, [resendCooldown, formData.email, language]);

  const validationMsg: Record<string, Record<string, string>> = {
    en: { email: 'Please enter your email', fields: 'Please fill in all required fields', invalidEmail: 'Please enter a valid email address', shortPassword: 'Password must be at least 6 characters', mismatch: 'Passwords do not match', name: 'Please enter your full name' },
    tr: { email: 'Lütfen e-posta adresinizi girin', fields: 'Lütfen tüm alanları doldurun', invalidEmail: 'Geçerli bir e-posta adresi girin', shortPassword: 'Şifre en az 6 karakter olmalıdır', mismatch: 'Şifreler eşleşmiyor', name: 'Lütfen adınızı girin' },
    de: { email: 'Bitte geben Sie Ihre E-Mail ein', fields: 'Bitte füllen Sie alle Felder aus', invalidEmail: 'Bitte geben Sie eine gültige E-Mail ein', shortPassword: 'Passwort muss mindestens 6 Zeichen haben', mismatch: 'Passwörter stimmen nicht überein', name: 'Bitte geben Sie Ihren Namen ein' },
    fr: { email: 'Veuillez entrer votre email', fields: 'Veuillez remplir tous les champs', invalidEmail: 'Veuillez entrer un email valide', shortPassword: 'Le mot de passe doit avoir au moins 6 caractères', mismatch: 'Les mots de passe ne correspondent pas', name: 'Veuillez entrer votre nom' },
  };
  const vm = validationMsg[language] || validationMsg.en;

  const validateForm = () => {
    if (mode === 'forgot-password') {
      if (!formData.email) { toast.error(vm.email); return false; }
      return true;
    }
    if (!formData.email || !formData.password) { toast.error(vm.fields); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { toast.error(vm.invalidEmail); return false; }
    if (formData.password.length < 6) { toast.error(vm.shortPassword); return false; }
    if (mode === 'signup' && formData.password !== formData.confirmPassword) { toast.error(vm.mismatch); return false; }
    if (mode === 'signup' && !formData.fullName.trim()) { toast.error(vm.name); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          formData.email.trim().toLowerCase(),
          { redirectTo: getResetRedirectUrl() },
        );
        if (error) {
          // Show the exact Supabase error (rate limit, URL mismatch, etc.)
          const detail = (error as any).status ? ` [${(error as any).status}]` : '';
          toast.error(`${error.message}${detail}`, { duration: 8000 });
          return;
        }
        setResetEmailSent(true);
        toast.success('Password reset link sent! Check your inbox and spam folder.');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) {
          const errMsgs: Record<string, Record<string, string>> = {
            en: { invalid: 'Invalid email or password', notConfirmed: 'Account not verified. Please try again.' },
            tr: { invalid: 'Geçersiz e-posta veya şifre', notConfirmed: 'Hesap doğrulanamadı. Lütfen tekrar deneyin.' },
            de: { invalid: 'Ungültige E-Mail oder Passwort', notConfirmed: 'Konto nicht verifiziert. Bitte versuchen Sie es erneut.' },
            fr: { invalid: 'Email ou mot de passe invalide', notConfirmed: 'Compte non vérifié. Veuillez réessayer.' },
          };
          const em = errMsgs[language] || errMsgs.en;
          if (error.message.includes('Invalid login credentials')) {
            toast.error(em.invalid);
          } else if (error.message.includes('Email not confirmed')) {
            toast.error(em.notConfirmed);
          } else {
            toast.error(error.message);
          }
          return;
        }
        const welcomeMsgs: Record<string, string> = { en: 'Welcome back!', tr: 'Hoş geldiniz!', de: 'Willkommen zurück!', fr: 'Bon retour !' };
        toast.success(welcomeMsgs[language] || welcomeMsgs.en);
        navigate('/dashboard');
      } else {
        // signup — attach referral code if captured from ?ref= landing
        const affiliateRef = localStorage.getItem('affiliate_ref');
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: formData.fullName,
              ...(affiliateRef ? { referred_by: affiliateRef } : {}),
            },
          },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            const regMsgs: Record<string, string> = { en: 'This email is already registered. Please sign in.', tr: 'Bu e-posta zaten kayıtlı. Giriş yapın.', de: 'Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.', fr: 'Cet email est déjà enregistré. Veuillez vous connecter.' };
            toast.error(regMsgs[language] || regMsgs.en);
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data?.session) {
          // Clear stored affiliate ref now that it's been attached to the user account
          if (affiliateRef) localStorage.removeItem('affiliate_ref');
          const createMsgs: Record<string, string> = { en: 'Account created! Welcome.', tr: 'Hesap oluşturuldu! Hoş geldiniz.', de: 'Konto erstellt! Willkommen.', fr: 'Compte créé ! Bienvenue.' };
          toast.success(createMsgs[language] || createMsgs.en);
          navigate('/onboarding');
        } else {
          setShowEmailConfirmation(true);
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">{l.emailConfirmTitle}</h1>
          <p className="text-muted-foreground mb-2">
            {l.emailConfirmDesc}
          </p>
          <p className="font-medium text-foreground mb-6">{formData.email}</p>
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">{l.emailConfirmHint}</p>
          </div>
          <Button
            variant="gold"
            className="w-full h-12 mb-3"
            onClick={() => {
              setShowEmailConfirmation(false);
              setMode('signin');
            }}
          >
            {l.goToSignIn}
          </Button>
          <button
            onClick={() => setShowEmailConfirmation(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.tryDifferentEmail}
          </button>
        </div>
      </div>
    );
  }

  // Reset email sent screen
  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{l.resetSent}</h1>
          <p className="text-muted-foreground mb-1">{l.resetSentDesc}</p>
          <p className="text-sm font-medium text-foreground mb-6">{formData.email}</p>

          {/* Resend link with cooldown */}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || isLoading}
            className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-primary hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : ({ en: 'Resend email', tr: 'Yeniden gönder', de: 'Erneut senden', fr: 'Renvoyer l\'email' }[language] ?? 'Resend email')
            }
          </button>

          <Button
            variant="gold"
            className="w-full h-12"
            onClick={() => {
              setResetEmailSent(false);
              setMode('signin');
            }}
          >
            {l.backToSignIn}
          </Button>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'signup': return l.signUpTitle;
      case 'forgot-password': return l.forgotTitle;
      default: return l.signInTitle;
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup': return l.signUpSubtitle;
      case 'forgot-password': return l.forgotSubtitle;
      default: return l.signInSubtitle;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{{ en: 'Back to home', tr: 'Ana sayfaya dön', de: 'Zurück zur Startseite', fr: 'Retour à l\'accueil' }[language] || 'Back to home'}</span>
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
              <Crown className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Sovereign</span>
          </div>

          {/* Mode Tabs */}
          {mode !== 'forgot-password' && (
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signin'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="w-4 h-4" />
                {l.signIn}
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {l.signUp}
              </button>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2">{getTitle()}</h1>
          <p className="text-muted-foreground mb-8">{getSubtitle()}</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{l.fullName}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-12"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{l.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12"
                required
              />
            </div>

            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <Label htmlFor="password">{l.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{l.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12"
                  required
                  minLength={6}
                />
              </div>
            )}

            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-sm text-primary hover:underline"
                >
                  {l.forgotPassword}
                </button>
              </div>
            )}

            <Button variant="gold" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'forgot-password'
                    ? ({ en: 'Sending…', tr: 'Gönderiliyor…', de: 'Wird gesendet…', fr: 'Envoi…' }[language] ?? 'Sending…')
                    : mode === 'signup'
                      ? ({ en: 'Creating account…', tr: 'Hesap oluşturuluyor…', de: 'Konto wird erstellt…', fr: 'Création du compte…' }[language] ?? 'Creating account…')
                      : ({ en: 'Signing in…', tr: 'Giriş yapılıyor…', de: 'Anmelden…', fr: 'Connexion…' }[language] ?? 'Signing in…')
                  }
                </>
              ) : mode === 'forgot-password' ? (
                l.sendReset
              ) : mode === 'signup' ? (
                l.signUp
              ) : (
                l.signIn
              )}
            </Button>
          </form>

          {/* Footer links */}
          {mode === 'forgot-password' && (
            <p className="text-sm text-center mt-6">
              <button
                onClick={() => setMode('signin')}
                className="text-primary hover:underline font-medium"
              >
                {l.backToSignIn}
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-sm text-muted-foreground text-center mt-6">
              {l.termsAgree}{' '}
              <Link to="/terms" className="text-primary hover:underline">{l.terms}</Link>
              {' '}{l.and}{' '}
              <Link to="/privacy" className="text-primary hover:underline">{l.privacy}</Link>
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 bg-card items-center justify-center p-16 relative overflow-hidden">
        <div className="hero-glow top-1/4 left-1/4" />
        <div className="hero-glow bottom-1/4 right-1/4 opacity-50" />
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold-lg mx-auto mb-8 float">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t.hero.title} <span className="text-gradient-gold">{t.hero.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground">{t.hero.subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
