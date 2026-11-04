import { useEffect } from 'react';
import { STARTUP_TIMEOUT_MS } from '@/lib/withTimeout';
import { unlockBodyScroll } from '@/lib/unlockScroll';

/** Force a loading flag off after the global hard cap so spinners cannot hang. */
export function useHardLoadingTimeout(
  setLoading: (value: boolean) => void,
  ms: number = STARTUP_TIMEOUT_MS,
) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false);
      unlockBodyScroll();
    }, ms);
    return () => window.clearTimeout(timer);
  }, [setLoading, ms]);
}
