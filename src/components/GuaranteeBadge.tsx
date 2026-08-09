import { Shield, Star } from 'lucide-react';

interface GuaranteeBadgeProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const GuaranteeBadge = ({ variant = 'full', className = '' }: GuaranteeBadgeProps) => {
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 ${className}`}>
        <Shield className="w-3.5 h-3.5 text-green-400 shrink-0" />
        <span className="text-xs font-medium text-green-400">
          80%+ ATS Guaranteed · 30-Day Credit Back
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-green-500/20 bg-green-500/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-foreground">Interview Guarantee</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
              GUARANTEED
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We guarantee an <span className="text-green-400 font-medium">80%+ ATS score</span> on your
            optimized CV. If your optimized score falls below 80% or you don't receive an interview
            call within 30 days of applying, we'll refund your credit — no questions asked.
          </p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            {[
              '80%+ ATS Score Guaranteed',
              '30-Day Credit Back Promise',
              'Instant Rewrite If Failed',
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                <Star className="w-3 h-3 text-green-400 fill-green-400/50" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
