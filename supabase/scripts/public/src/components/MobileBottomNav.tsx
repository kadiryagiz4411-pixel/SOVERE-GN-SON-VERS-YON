import { Link, useLocation } from 'react-router-dom';
import { Home, User, History, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useLanguage } from '@/i18n/LanguageContext';

const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

export const MobileBottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: '/dashboard', icon: Home, label: t.nav.dashboard },
    { path: '/cv-builder', icon: FileText, label: 'CV' },
    { path: '/proposals', icon: History, label: t.dashboard.history },
    { path: '/profile', icon: User, label: t.dashboard.profile },
    { path: '/pricing', icon: Settings, label: t.nav.pricing },
  ];

  const routes = navItems.map(item => item.path);
  const { currentIndex, totalPages } = useSwipeNavigation({ routes, enabled: false });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      {/* Swipe indicator dots */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm border border-border/50">
        {navItems.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              location.pathname === navItems[index].path
                ? "bg-primary w-4"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={triggerHaptic}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 relative group",
                "active:scale-90",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div 
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full transition-all duration-300",
                  isActive 
                    ? "bg-primary opacity-100 scale-x-100" 
                    : "bg-transparent opacity-0 scale-x-0"
                )}
              />
              
              <div className={cn(
                "transition-all duration-200",
                isActive ? "scale-110" : "group-active:scale-90"
              )}>
                <Icon 
                  className={cn(
                    "w-5 h-5 mb-1 transition-all duration-200",
                    isActive && "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                  )} 
                />
              </div>
              
              <span 
                className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                )}
              >
                {item.label}
              </span>
              
              <div 
                className={cn(
                  "absolute inset-0 rounded-lg transition-all duration-300",
                  "group-active:bg-primary/10"
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

// Export the swipe wrapper component
export const SwipeablePageWrapper = ({ children }: { children: React.ReactNode }) => {
  const routes = ['/dashboard', '/cv-builder', '/proposals', '/profile', '/pricing'];
  const { onTouchStart, onTouchMove, onTouchEnd, isSwiping, swipeDirection } = useSwipeNavigation({
    routes,
    threshold: 80,
    enabled: true,
  });

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn(
        "min-h-screen transition-transform duration-150",
        isSwiping && swipeDirection === 'left' && "-translate-x-4 opacity-90",
        isSwiping && swipeDirection === 'right' && "translate-x-4 opacity-90"
      )}
    >
      {children}
    </div>
  );
};
