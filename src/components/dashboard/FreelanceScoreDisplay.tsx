import { isPaidPlan, isElitePlan } from '@/lib/plans';
import { Lock, TrendingUp, Target, Zap, Shield, FileText, Ruler, BarChart3, Settings, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type CompetitiveScoreResult, FREELANCE_FACTOR_LABELS } from '@/lib/competitiveScoring';

// Legacy type support
interface LegacyFreelanceScoreBreakdown {
  overallScore: number;
  factors: Record<string, number> | { hookStrength: number; clientPainAlignment: number; skillRelevance: number; proofDensity: number; ctaClarity: number; lengthOptimization: number; platformCompetitiveness: number; clusterCalibration: number };
  percentile: string;
  interpretation: string;
  topSuggestions: string[];
}

interface FreelanceScoreDisplayProps {
  score?: LegacyFreelanceScoreBreakdown;
  competitiveScore?: CompetitiveScoreResult | null;
  plan: string;
  onUpgrade: () => void;
}

const factorIcons: Record<string, any> = {
  hookStrength: Zap,
  clientPainAlignment: Target,
  skillRelevance: Settings,
  proofDensity: Shield,
  ctaClarity: FileText,
  lengthOptimization: Ruler,
  platformCompetitionImpact: BarChart3,
  clusterFit: TrendingUp,
};

export const FreelanceScoreDisplay = ({ score, competitiveScore, plan, onUpgrade }: FreelanceScoreDisplayProps) => {
  const isPaid = isPaidPlan(plan);
  const isElite = isElitePlan(plan);

  // Prefer competitive score
  const displayScore = competitiveScore?.competitiveScore ?? score?.overallScore ?? 0;
  const percentile = competitiveScore?.percentile ?? score?.percentile ?? '';
  const interpretation = competitiveScore?.interpretation ?? score?.interpretation ?? '';
  const suggestions = competitiveScore?.suggestions ?? score?.topSuggestions ?? [];
  const factors = competitiveScore?.factors ?? score?.factors ?? {};

  const scoreColor = displayScore >= 70 ? 'text-green-500' : displayScore >= 55 ? 'text-amber-500' : 'text-red-500';
  const progressColor = (v: number) => v >= 70 ? 'bg-green-500' : v >= 55 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Proposal Acceptance Score</h3>
        <div className="flex items-center gap-1.5">
          {competitiveScore && (
            <Badge variant="outline" className="text-[10px]">
              {competitiveScore.competitionLevel}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{percentile}</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`text-4xl font-bold ${scoreColor}`}>{displayScore}%</div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{interpretation}</p>
          {competitiveScore && (
            <p className="text-xs text-muted-foreground mt-1">
              {competitiveScore.contextLabel}
            </p>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Improvement Suggestions</h4>
        {(isPaid ? suggestions : suggestions.slice(0, 3)).map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-foreground">
            <span className="text-primary mt-0.5">•</span>
            <span>{s}</span>
          </div>
        ))}
        {!isPaid && suggestions.length > 3 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Lock className="w-3 h-3" />
            <span>{suggestions.length - 3} more with Pro</span>
          </div>
        )}
      </div>

      {/* Factor Breakdown — Pro/Elite */}
      {isPaid ? (
        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Factor Breakdown</h4>
          {Object.entries(factors).map(([key, value]) => {
            const label = FREELANCE_FACTOR_LABELS[key] || key;
            const Icon = factorIcons[key] || BarChart3;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="w-3 h-3" />
                    {label}
                  </span>
                  <span className="text-foreground font-medium">{value}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Lock className="w-3 h-3" />
            <span>Full factor breakdown available with Pro</span>
          </div>
          <Button variant="outline" size="sm" onClick={onUpgrade} className="text-xs">
            Unlock Full Analysis
          </Button>
        </div>
      )}

      {/* Elite: Simulation */}
      {isElite && competitiveScore && (
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-medium text-amber-500 uppercase tracking-wider">Score Simulation</h4>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Current</div>
                <div className={`text-xl font-bold ${scoreColor}`}>{competitiveScore.competitiveScore}%</div>
              </div>
              <Zap className="w-4 h-4 text-amber-500" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Optimized</div>
                <div className="text-xl font-bold text-green-500">{competitiveScore.optimizedPotential}%</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              +{competitiveScore.optimizedPotential - competitiveScore.competitiveScore}% potential improvement
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            🏆 Percentile: <strong className="text-foreground">{competitiveScore.percentile}</strong> ·
            📊 <strong className="text-foreground">{competitiveScore.competitionLevel}</strong>
          </p>
        </div>
      )}

      {/* Elite upsell */}
      {!isElite && isPaid && (
        <div className="border-t border-border pt-3 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Crown className="w-3 h-3 text-amber-500" />
            <span>Score simulation & competitive scenarios with Elite</span>
          </div>
        </div>
      )}
    </div>
  );
};
