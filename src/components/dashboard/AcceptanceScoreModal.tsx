import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Lock,
  Crown,
  BarChart3,
  Zap,
} from 'lucide-react';
import { isPaidPlan, isElitePlan } from '@/lib/plans';
import { type CompetitiveScoreResult, CORPORATE_FACTOR_LABELS, FREELANCE_FACTOR_LABELS } from '@/lib/competitiveScoring';

// Legacy support — old AcceptanceScoreResult
interface LegacyAcceptanceScoreResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
}

interface AcceptanceScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LegacyAcceptanceScoreResult | null;
  competitiveResult?: CompetitiveScoreResult | null;
  segment?: 'corporate' | 'freelancer';
  plan?: string;
  onUpgrade?: () => void;
}

export const AcceptanceScoreModal = ({
  open,
  onOpenChange,
  result,
  competitiveResult,
  segment = 'corporate',
  plan = 'basic',
  onUpgrade,
}: AcceptanceScoreModalProps) => {
  const isPaid = isPaidPlan(plan);
  const isElite = isElitePlan(plan);
  const factorLabels = segment === 'freelancer' ? FREELANCE_FACTOR_LABELS : CORPORATE_FACTOR_LABELS;

  // Use competitive result if available, fallback to legacy
  const score = competitiveResult?.competitiveScore ?? result?.score ?? 0;
  const summary = competitiveResult?.interpretation ?? result?.summary ?? '';
  const suggestions = competitiveResult?.suggestions ?? result?.suggestions ?? [];
  const strengths = result?.strengths ?? [];
  const weaknesses = result?.weaknesses ?? [];

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-500';
    if (s >= 55) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProgressColor = (s: number) => {
    if (s >= 70) return 'bg-green-500';
    if (s >= 55) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="w-5 h-5 text-primary" />
            Acceptance Probability Analysis
          </DialogTitle>
        </DialogHeader>

        {(result || competitiveResult) ? (
          <div className="space-y-5 py-4">
            {/* Score Display */}
            <div className="text-center p-6 rounded-xl bg-muted/50 border border-border">
              <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
                {score}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {competitiveResult?.contextLabel ?? (score >= 70 ? 'Strong' : score >= 55 ? 'Competitive' : 'Needs Optimization')}
              </div>
              {competitiveResult && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {competitiveResult.competitionLevel}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {competitiveResult.percentile}
                  </Badge>
                </div>
              )}
              <div className="mt-4 relative">
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Summary / Interpretation */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground">{summary}</p>
            </div>

            {/* Suggestions (all users) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Improvement Suggestions</h3>
              </div>
              <ul className="space-y-2">
                {(isPaid ? suggestions : suggestions.slice(0, 3)).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
              {!isPaid && suggestions.length > 3 && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>{suggestions.length - 3} more suggestions available with Pro</span>
                </div>
              )}
            </div>

            {/* Factor Breakdown — Pro/Elite */}
            {competitiveResult && isPaid ? (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Factor Breakdown</h3>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(competitiveResult.factors).map(([key, value]) => {
                    const label = factorLabels[key] || key;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="text-foreground font-medium">{value}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColor(value)}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : competitiveResult && !isPaid ? (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Lock className="w-3 h-3" />
                  <span>Full factor breakdown available with Pro</span>
                </div>
                {onUpgrade && (
                  <Button variant="outline" size="sm" onClick={onUpgrade} className="text-xs">
                    Unlock Full Analysis
                  </Button>
                )}
              </div>
            ) : null}

            {/* Legacy strengths/weaknesses */}
            {strengths.length > 0 && isPaid && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-foreground text-sm">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && isPaid && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-foreground text-sm">Areas for Improvement</h3>
                </div>
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <TrendingDown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Elite: Simulation Engine */}
            {isElite && competitiveResult && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-amber-500 text-sm">Elite: Score Simulation</h3>
                </div>
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Current</div>
                      <div className={`text-2xl font-bold ${getScoreColor(competitiveResult.competitiveScore)}`}>
                        {competitiveResult.competitiveScore}%
                      </div>
                    </div>
                    <Zap className="w-5 h-5 text-amber-500" />
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Optimized Potential</div>
                      <div className={`text-2xl font-bold ${getScoreColor(competitiveResult.optimizedPotential)}`}>
                        {competitiveResult.optimizedPotential}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full" 
                         style={{ width: `${competitiveResult.optimizedPotential}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Applying suggested improvements could increase your score by{' '}
                    <strong className="text-foreground">
                      +{competitiveResult.optimizedPotential - competitiveResult.competitiveScore}%
                    </strong>
                  </p>
                </div>
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    🏆 Competitive Percentile: <strong className="text-foreground">{competitiveResult.percentile}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📊 Competition Level: <strong className="text-foreground">{competitiveResult.competitionLevel}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Elite upsell for non-elite */}
            {!isElite && competitiveResult && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span>Score simulation, percentile rank & competitive scenarios available with Elite</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading analysis...
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
