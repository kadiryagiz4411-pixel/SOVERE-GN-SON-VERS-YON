import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, FileText, Briefcase, Settings, LogOut, Target,
  Crown, Zap, Menu, X, Shield, ChevronLeft, Building2,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@supabase/supabase-js';

interface AppShellProps {
  children: React.ReactNode;
  user: User | null;
  plan?: string;
  creditsBalance?: number;
  orgRole?: string;
}

export const AppShell = ({ children, user, plan = 'free', creditsBalance = 0, orgRole }: AppShellProps) => {
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin(user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isElite = plan === 'elite';
  const isPro = plan === 'pro' || plan === 'elite';

  const txt = {
    dashboard: language === 'tr' ? 'Panel' : language === 'de' ? 'Dashboard' : language === 'fr' ? 'Tableau de bord' : 'Dashboard',
    cvBuilder: language === 'tr' ? 'CV Oluştur' : language === 'de' ? 'CV-Editor' : language === 'fr' ? 'CV Builder' : 'CV Builder',
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
    { to: '/cv-builder', label: txt.cvBuilder, icon: FileText },
    { to: '/pipeline', label: txt.pipeline, icon: Briefcase },
    { to: '/apply-queue', label: txt.applyQueue, icon: Target },
    { to: '/proposals', label: txt.history, icon: FileText },
    { to: '/pricing', label: txt.pricing, icon: Zap },
    { to: '/profile', label: txt.profile, icon: Settings },
  ];

  if (orgRole === 'org_admin') {
    navItems.push({ to: '/organization', label: 'Org Dashboard', icon: Building2 });
  }

  if (isAdmin) {
    navItems.push({ to: '/admin', label: txt.admin, icon: Shield });
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const planLabel = isElite ? 'Elite' : isPro ? 'Pro' : 'Free';

  return (
    <div className="min-h-screen bg-background flex">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{txt.credits}</span>
            <span className={`text-sm font-bold ${creditsBalance <= 0 ? 'text-destructive' : creditsBalance <= 300 ? 'text-amber-500' : 'text-foreground'}`}>
              {creditsBalance}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${creditsBalance <= 0 ? 'bg-destructive' : creditsBalance <= 300 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, (creditsBalance / 5000) * 100)}%` }}
            />
          </div>
        </div>

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
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isElite ? 'bg-amber-500/20 text-amber-500' : isPro ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {creditsBalance} {txt.credits}
            </span>
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
        {children}
      </main>
    </div>
  );
};
