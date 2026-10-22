import { useEffect, useState } from 'react';

const ATTR = 'data-sovereign-extension';

function readVersion(): string {
  if (typeof document === 'undefined') return '';
  return document.documentElement.getAttribute(ATTR) || '';
}

export function useSovereignExtension() {
  const [version, setVersion] = useState(readVersion);

  useEffect(() => {
    const sync = () => setVersion(readVersion());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [ATTR],
    });
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SOVEREIGN_EXTENSION_READY') {
        setVersion(String(event.data.version || readVersion() || '1'));
      }
    };
    window.addEventListener('message', onMessage);
    const timer = window.setInterval(() => {
      if (readVersion()) {
        sync();
        window.clearInterval(timer);
        return;
      }
      sync();
    }, 4000);
    return () => {
      observer.disconnect();
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
    };
  }, []);

  return {
    connected: Boolean(version),
    version,
  };
}
