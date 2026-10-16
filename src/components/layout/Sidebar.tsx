/**
 * Scrollable sidebar nav that keeps its scroll position across route changes.
 * Vite SPA — uses react-router location, not Next.js usePathname.
 */
import { useLayoutEffect, useEffect, useRef, type ReactNode, type UIEvent } from 'react';
import { useLocation } from 'react-router-dom';

export const SIDEBAR_SCROLL_KEY = 'sidebar_scroll_position';

function readSavedScroll(): number | null {
  try {
    const raw = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeSavedScroll(top: number) {
  try {
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(top));
  } catch {
    /* private mode / quota */
  }
}

interface SidebarNavProps {
  children: ReactNode;
  className?: string;
}

export function SidebarNav({ children, className }: SidebarNavProps) {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  const persist = () => {
    if (navRef.current) writeSavedScroll(navRef.current.scrollTop);
  };

  const restore = () => {
    const el = navRef.current;
    const saved = readSavedScroll();
    if (el && saved !== null) el.scrollTop = saved;
  };

  useLayoutEffect(() => {
    restore();
    const id = requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    restore();
  }, [pathname]);

  const handleScroll = (e: UIEvent<HTMLElement>) => {
    writeSavedScroll((e.currentTarget as HTMLElement).scrollTop);
  };

  return (
    <nav
      ref={navRef}
      onScroll={handleScroll}
      onClick={persist}
      className={className}
      style={{ overflowAnchor: 'none' }}
    >
      {children}
    </nav>
  );
}
