import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Crown } from 'lucide-react';
import { SocialShare } from '@/components/SocialShare';

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-gold-dark flex items-center justify-center shadow-gold">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Sovereign</span>
            </Link>
            <p className="text-muted-foreground max-w-sm mb-4">
              {t.footer.tagline}
            </p>
            <p className="text-sm text-muted-foreground/70 mb-4">
              {t.footer.disclaimer}
            </p>
            <SocialShare />
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.legal}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.terms}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.company || 'Resources'}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t.nav?.features || 'Features'}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t.nav?.pricing || 'Pricing'}
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:johnwelly9080@gmail.com" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.footer.contact || 'Contact'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
          {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
};
