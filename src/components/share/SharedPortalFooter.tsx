/**
 * PLG footer on public live-share portals.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function SharedPortalFooter() {
  return (
    <footer className="border-t border-border py-8 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-3">
        <p className="text-xs tracking-wide text-muted-foreground">
          Evaluated & Ranked by{' '}
          <span className="text-primary font-semibold">Sovereign AI</span>
          {' '}— Process 100+ Resumes in Seconds
        </p>
        <Link
          to="/auth?mode=signup&ref=share_portal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Rank your next shortlist in Sovereign
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </footer>
  );
}

export default SharedPortalFooter;
