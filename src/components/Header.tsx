import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { CreditBadge } from '@/components/credits/CreditBadge';
import { supabase } from '@/integrations/supabase/client';

export const Header = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, creditsBalance } = useSession();

  const isActive = (path: string) => location.pathname === path;

  // Sign-out: call Supabase, reset all local state, return to landing page.
  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore errors — navigate regardless */
    }
    navigate('/', { replace: true });
  };

  const navLinks = [
    { path: '/', label: t.nav.home },
    { path: '/features', label: t.nav.features },
    { path: '/pricing', label: t.nav.pricing },
    { path: '/cv-builder', label: 'CV Builder' },
    { path: '/#extension', label: 'Extension' },
  ];

  return (
    <header className="fixed top-8 left-0 right-0 z-40 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <BrandLogo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}>
                <Button
                  variant="nav"
                  className={isActive(link.path) ? 'text-foreground' : ''}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector />
            {user ? (
              /* ── Authenticated ── */
              <>
                <CreditBadge balance={creditsBalance} />
                <Link to="/dashboard">
                  <Button variant="ghost" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              /* ── Guest ── */
              <>
                <Link to="/auth">
                  <Button variant="ghost">{t.nav.login}</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button variant="gold">{t.nav.signup}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${isActive(link.path) ? 'text-foreground bg-accent' : ''}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}

              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                <LanguageSelector />
                {user ? (
                  <div className="flex gap-2">
                    <CreditBadge balance={creditsBalance} />
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSignOut}>
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm">{t.nav.login}</Button>
                    </Link>
                    <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="gold" size="sm">{t.nav.signup}</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
