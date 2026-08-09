import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t.nav.home },
    { path: '/features', label: t.nav.features },
    { path: '/pricing', label: t.nav.pricing },
    { path: '/cv-builder', label: 'CV Builder' },
  ];

  return (
    <header className="fixed top-8 left-0 right-0 z-40 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/pwa-192x192.png" alt="Sovereign" className="w-9 h-9 rounded-lg shadow-gold group-hover:shadow-gold-lg transition-shadow" />
            <span className="text-xl font-bold text-foreground">Sovereign</span>
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
            <Link to="/auth">
              <Button variant="ghost">{t.nav.login}</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button variant="gold">{t.nav.signup}</Button>
            </Link>
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
                <div className="flex gap-2">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm">{t.nav.login}</Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="gold" size="sm">{t.nav.signup}</Button>
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
