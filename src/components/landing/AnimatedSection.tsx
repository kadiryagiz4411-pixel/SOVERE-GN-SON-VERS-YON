import { motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SAFE_VIEWPORT } from '@/lib/motionViewport';
import { STARTUP_TIMEOUT_MS } from '@/lib/withTimeout';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedSection = ({ children, className = '', delay = 0 }: AnimatedSectionProps) => {
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setForceShow(true), STARTUP_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary
      fallback={
        <section className="py-10 px-4 text-center text-sm text-muted-foreground">
          This section failed to load.
        </section>
      }
    >
      <motion.div
        initial={{ opacity: 1, y: forceShow ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={SAFE_VIEWPORT}
        transition={{ duration: 0.45, delay: forceShow ? 0 : delay, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </ErrorBoundary>
  );
};
