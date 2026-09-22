import { useState, memo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { CreditCounterWidget } from '@/components/CreditCounterWidget';
import { CreditBadge } from '@/components/credits/CreditBadge';
import {
  LayoutDashboard, FileText, Briefcase, Settings, LogOut, Target,
  Crown, Zap, Menu, X, Shield, ChevronLeft, Building2, Key, Users, Rocket,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@supabase/supabase-js';
import { useSession } from '@/contexts/SessionContext';
import { usePlan } from '@/contexts/PlanContext';
import { useTierAccess, type AccessTier } from '@/hooks/useTierAccess';
import { TierGate, TierLockBadge } from '@/components/auth/TierGate';
import { ELITE_NAV_ITEMS, ENTERPRISE_NAV_ITEMS, type TierNavItem } from '@/config/tierNav';
import { OWNER_EMAIL, SUPERADMIN_PLAN_LABEL } from '@/lib/superadmin';
import { AppSumoUpsellBanner } from '@/components/banners/AppSumoUpsellBanner';
import { TrialCountdownBadge } from '@/components/dashboard/TrialCountdownBadge';
import { SubscriptionRequiredModal } from '@/components/modals/SubscriptionRequiredModal';
import { useB2BTrial } from '@/hooks/useB2BTrial';
import { isB2BEnterprisePath } from '@/lib/b2bTrial';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AppShellProps {
  children: React.ReactNode;
  user: User | null;
  plan?: string;
  creditsBalance?: number;
  orgRole?: string;
}

export const AppShell = memo(({ children, user, plan = 'free', creditsBalance = 0, orgRole }: AppShellProps) => {
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const {
    remainingCredits,
    monthlyCreditLimit,
    appsumoTier,
    isByokUnlimited,
    hasB2BAccess: sessionB2B,
    hasBYOKAccess: sessionBYOK,
    planType,
  } = session;
  const { isAdmin } = useAdmin(user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const access = useTierAccess();
  const planState = usePlan();
  const b2bTrial = useB2BTrial();
  const [lockModal, setLockModal] = useState<{ featureName: string; required: AccessTier } | null>(null);

  const isSuperAdmin =
    user?.email === OWNER_EMAIL ||
    session.user?.email === OWNER_EMAIL;
  const hasB2BAccess = isSuperAdmin || sessionB2B || planState.hasEnterpriseAccess;
  const hasBYOKAccess = isSuperAdmin || sessionBYOK || Number(appsumoTier) >= 3;

  useEffect(() => {
    console.log('[Sovereign Auth]', {
      email: user?.email ?? session.user?.email,
      tier: isSuperAdmin ? 3 : appsumoTier,
      hasB2B: hasB2BAccess,
    });
  }, [user?.email, session.user?.email, appsumoTier, isSuperAdmin, hasB2BAccess]);

  const isElite = isSuperAdmin || plan === 'elite' || access.canAccess('elite');
  const isPro = isSuperAdmin || plan === 'pro' || plan === 'elite' || access.canAccess('pro');
  const isEnterprise =
    isSuperAdmin ||
    access.canAccess('enterprise') ||
    plan === 'enterprise' ||
    plan === 'B2B_ENTERPRISE' ||
    planType === 'B2B_ENTERPRISE';

  const currentCredits = remainingCredits ?? creditsBalance ?? 0;
  const maxCredits = monthlyCreditLimit || 400;
  const showAgencyTools = isSuperAdmin || Number(appsumoTier) >= 2 || isPro;
  const showByokSettings = isSuperAdmin || hasBYOKAccess || isByokUnlimited;
  const eliteNav = isSuperAdmin
    ? ELITE_NAV_ITEMS
    : ELITE_NAV_ITEMS.filter((item) => {
      if (item.to === '/batch-proposal' || item.to === '/knowledge-base') return showAgencyTools;
      return true;
    });
  const enterpriseNav = ENTERPRISE_NAV_ITEMS;
  const percentage = maxCredits > 0
    ? Math.min(100, Math.max(0, Math.round((currentCredits / maxCredits) * 100)))
    : 0;

  const txt = {
    dashboard: language === 'tr' ? 'Başvuru Motoru' : language === 'de' ? 'Application Engine' : language === 'fr' ? 'Moteur de candidature' : 'Application Engine',
    cvBuilder: language === 'tr' ? 'CV Aracı' : language === 'de' ? 'CV-Tool' : language === 'fr' ? 'Outil CV' : 'CV Builder',
    pipeline: language === 'tr' ? 'Başvurular' : language === 'de' ? 'Bewerbungen' : language === 'fr' ? 'Candidatures' : 'Pipeline',
    applyQueue: language === 'tr' ? 'Akıllı Kuyruk' : language === 'de' ? 'Bewerbungsqueue' : language === 'fr' ? 'File intelligente' : 'Apply Queue',
    history: language === 'tr' ? 'Geçmiş' : language === 'de' ? 'Verlauf' : language === 'fr' ? 'Historique' : 'History',
    profile: language === 'tr' ? 'Profil' : language === 'de' ? 'Profil' : language === 'fr' ? 'Profil' : 'Profile',
    pricing: language === 'tr' ? 'Plan & Kredi' : language === 'de' ? 'Plan & Credits' : language === 'fr' ? 'Plan & Crédits' : 'Plan & Credits',
    admin: 'Admin',
    signOut: language === 'tr' ? 'Çıkış' : language === 'de' ? 'Abmelden' : language === 'fr' ? 'Déconnexion' : 'Sign Out',
    credits: language === 'tr' ? 'Kredi' : language === 'de' ? 'Credits' : language === 'fr' ? 'Crédits' : 'Credits',
  };

  const navItems = [
    { to: '/dashboard', label: txt.dashboard, icon: LayoutDashboard },
    { to: '/pipeline', label: txt.pipeline, icon: Briefcase },
    { to: '/apply-queue', label: txt.applyQueue, icon: Target },
    { to: '/proposals', label: txt.history, icon: FileText },
    { to: '/cv-builder', label: txt.cvBuilder, icon: FileText },
    { to: '/pricing', label: txt.pricing, icon: Zap },
    { to: '/profile', label: txt.profile, icon: Settings },
  ] as Array<{ to: string; label: string; icon: typeof Settings }>;

  if (showByokSettings) {
    navItems.push({ to: '/profile#byok', label: 'BYOK Settings', icon: Key });
  }

  if (isSuperAdmin || orgRole === 'org_admin' || isEnterprise) {
    if (!navItems.some((item) => item.to === '/organization')) {
      navItems.push({ to: '/organization', label: 'Org Dashboard', icon: Building2 });
    }
    if (!navItems.some((item) => item.to === '/team')) {
      navItems.push({ to: '/team', label: 'Team Workspace', icon: Users });
    }
  }

  if (isAdmin) {
    navItems.push({ to: '/admin', label: txt.admin, icon: Shield });
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const planLabel = isSuperAdmin
    ? SUPERADMIN_PLAN_LABEL
    : isEnterprise
      ? 'Enterprise B2B'
      : isElite
        ? 'Elite'
        : isPro
          ? 'Pro'
          : plan === 'standard'
            ? 'Standard'
            : 'Free';

  const handleLockedNav = (item: TierNavItem) => {
    if (isSuperAdmin || hasB2BAccess || access.canAccess(item.required)) {
      navigate(item.to);
      setSidebarOpen(false);
      return;
    }
    setLockModal({ featureName: item.label, required: item.required });
  };

  const renderTierNav = (items: TierNavItem[]) => items.map((item) => {
    const Icon = item.icon;
    const active = location.pathname === item.to;
  const unlocked = isSuperAdmin || planState.hasEnterpriseAccess || access.canAccess(item.required);
    if (unlocked) {
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      );
    }
    return (
      <button
        type="button"
        key={item.to}
        onClick={() => handleLockedNav(item)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        <TierLockBadge required={item.required} />
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-background flex">
      <ErrorBoundary fallback={null}>
        <SubscriptionRequiredModal
          open={!isSuperAdmin && b2bTrial.trialExpiredUnpaid && isB2BEnterprisePath(location.pathname)}
        />
      </ErrorBoundary>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed h-full z-30">
        {/* Brand */}
        <div className="p-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <div>
              <span className="text-lg font-bold text-foreground tracking-tight">Sovereign</span>
              <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isElite ? 'bg-amber-500/20 text-amber-500' : isPro ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {planLabel}
              </span>
            </div>
          </Link>
        </div>

        {/* Credit balance */}
        <div className="px-5 py-3 border-b border-border">
          <CreditBadge balance={currentCredits} unlimited={isByokUnlimited || hasBYOKAccess} className="w-full justify-center" />
          {!(isByokUnlimited || hasBYOKAccess) && (
            <>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${currentCredits <= 0 ? 'bg-destructive' : percentage < 20 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">{currentCredits.toLocaleString()} / {maxCredits.toLocaleString()} · 20 credits per AI action</p>
            </>
          )}
        </div>

        {/* Monthly AppSumo credit counter */}
        <CreditCounterWidget userId={user?.id ?? null} variant="sidebar" />
        {b2bTrial.showSidebarUpsellBadge && (
          <div className="px-3 pt-2">
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] font-semibold text-amber-200">
              <Rocket className="w-3 h-3" />
              Unlock B2B Enterprise
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Elite</p>
          {renderTierNav(eliteNav)}
          <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Enterprise</p>
          {renderTierNav(enterpriseNav)}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border space-y-2">
          <LanguageSelector />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            {txt.signOut}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-foreground">Sovereign</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <CreditBadge balance={currentCredits} unlimited={isByokUnlimited || hasBYOKAccess} />
            {/* Monthly AppSumo credits badge */}
            <CreditCounterWidget userId={user?.id ?? null} variant="badge" />
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">S</span>
                </div>
                <span className="font-bold text-foreground">Sovereign</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Elite</p>
              {renderTierNav(eliteNav)}
              <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Enterprise</p>
              {renderTierNav(enterpriseNav)}
            </nav>
            <div className="p-3 border-t border-border">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive w-full"
              >
                <LogOut className="w-4 h-4" />
                {txt.signOut}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {/* Wrap B2B widgets in a boundary so a render error there never blocks the main UI */}
        <ErrorBoundary fallback={null}>
          <AppSumoUpsellBanner />
        </ErrorBoundary>
        <div className="hidden lg:flex sticky top-0 z-20 items-center justify-end gap-3 px-6 py-3 border-b border-border bg-background/90 backdrop-blur-sm">
          <ErrorBoundary fallback={null}>
            <TrialCountdownBadge />
          </ErrorBoundary>
          <CreditBadge balance={currentCredits} unlimited={isByokUnlimited || hasBYOKAccess} />
        </div>
        {children}
      </main>
      <TierGate
        open={!!lockModal}
        onClose={() => setLockModal(null)}
        featureName={lockModal?.featureName ?? 'Locked feature'}
        requiredTier={lockModal?.required ?? 'elite'}
      />
    </div>
  );
});
