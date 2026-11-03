import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Crown, ExternalLink } from 'lucide-react';
import { SocialShare } from '@/components/SocialShare';
import { LEMON_SQUEEZY_AFFILIATE_URL } from '@/lib/lemonsqueezy';

const footerLinkClass = 'text-muted-foreground hover:text-foreground transition-colors';
const affiliateLinkClass =
  'inline-flex items-center gap-1.5 text-muted-foreground hover:text-amber-400 transition-colors';

export const Footer = () => {
  const { t } = useLanguage();
  const affiliatesLabel = t.footer.affiliates || 'Affiliates (Earn 30%)';

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
                <Link to="/privacy" className={footerLinkClass}>
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link to="/terms" className={footerLinkClass}>
                  {t.footer.terms}
                </Link>
              </li>
              <li>
                <Link to="/refund" className={footerLinkClass}>
                  {t.footer.refund || 'Refund Policy'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.company || 'Resources'}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className={footerLinkClass}>
                  {t.nav?.features || 'Features'}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className={footerLinkClass}>
                  {t.nav?.pricing || 'Pricing'}
                </Link>
              </li>
              <li>
                <a
                  href={LEMON_SQUEEZY_AFFILIATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={affiliateLinkClass}
                >
                  {affiliatesLabel}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:johnwelly9080@gmail.com"
                  className={footerLinkClass}
                >
                  {t.footer.contact || 'Contact'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Sovereign AI. All rights reserved.</div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
            <Link className="hover:text-foreground transition-colors" to="/privacy">
              {t.footer.privacy}
            </Link>
            <Link className="hover:text-foreground transition-colors" to="/terms">
              {t.footer.terms}
            </Link>
            <Link className="hover:text-foreground transition-colors" to="/refund">
              {t.footer.refund || 'Refund Policy'}
            </Link>
            <a
              href={LEMON_SQUEEZY_AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
            >
              {affiliatesLabel}
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
