import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { singlePassLabel } from '@/config/money';

interface FooterProps {
  /** Slim bar for dashboard / app chrome. Marketing pages use the full bar. */
  compact?: boolean;
}

const navLinkClass =
  'text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 hover:text-amber-400/90 transition-colors';

export const Footer = ({ compact = false }: FooterProps) => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const links = [
    { to: '/dashboard', label: t.nav?.dashboard || 'Dashboard' },
    { to: '/terms', label: t.footer.terms },
    { to: '/privacy', label: t.footer.privacy },
    { to: '/refund', label: t.footer.refund || 'Refund Policy' },
  ];

  return (
    <footer
      className={cn(
        'border-t border-zinc-800/90 bg-[#09090b]',
        compact && 'mb-16 lg:mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
      )}
    >
      <div
        className={cn(
          'mx-auto flex flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between',
          compact ? 'max-w-none py-3' : 'container py-7',
        )}
      >
        <Link
          to="/"
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-400 hover:text-amber-400/80 transition-colors"
        >
          Sovereign
        </Link>

        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-600">
          © {year} Sovereign
        </p>
      </div>

      {!compact && (
        <p className="px-4 pb-5 text-center font-mono text-[10px] leading-relaxed tracking-[0.08em] text-zinc-600">
          {singlePassLabel()} and subscriptions are digital services.{' '}
          <Link to="/refund" className="text-zinc-500 hover:text-amber-400/80 transition-colors">
            Refund Policy
          </Link>
        </p>
      )}
    </footer>
  );
};
