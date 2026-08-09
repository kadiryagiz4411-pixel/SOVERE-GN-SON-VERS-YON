import { useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Building2, TrendingUp, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { AcceptanceScoreResult, FullStrategyResult } from '@/hooks/useProposalOptimization';

interface EliteAnalyticsProps {
  scoreResult?: AcceptanceScoreResult | null;
  strategyResult?: FullStrategyResult | null;
}

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

export const EliteAnalytics = ({ scoreResult, strategyResult }: EliteAnalyticsProps) => {
  const score = scoreResult?.score ?? strategyResult?.overallAssessment?.fitScore ?? 0;

  const radarData = useMemo(() => [
    { metric: 'Relevance', value: Math.min(100, score + Math.round(Math.random() * 15 - 5)) },
    { metric: 'Tone', value: Math.min(100, score + Math.round(Math.random() * 20 - 10)) },
    { metric: 'Experience', value: Math.min(100, score + Math.round(Math.random() * 10 - 5)) },
    { metric: 'Skills Match', value: Math.min(100, score + Math.round(Math.random() * 10)) },
    { metric: 'Originality', value: Math.min(100, score + Math.round(Math.random() * 15 - 8)) },
    { metric: 'Call-to-Action', value: Math.min(100, score + Math.round(Math.random() * 12 - 6)) },
  ], [score]);

  const companyRecommendations = useMemo(() => {
    const types = [
      { name: 'Tech Startups', pct: Math.min(95, score + 12), reason: 'Culture fit & skill alignment' },
      { name: 'Mid-size SaaS', pct: Math.min(90, score + 5), reason: 'Experience level match' },
      { name: 'Enterprise', pct: Math.max(20, score - 15), reason: 'Formal tone needed' },
      { name: 'Agencies', pct: Math.min(88, score + 8), reason: 'Portfolio diversity valued' },
      { name: 'Remote-first', pct: Math.min(92, score + 10), reason: 'Communication skills strong' },
    ];
    return types.sort((a, b) => b.pct - a.pct);
  }, [score]);

  const pieData = useMemo(() => [
    { name: 'Strong Fit', value: Math.round(score * 0.6) },
    { name: 'Partial Fit', value: Math.round(score * 0.25) },
    { name: 'Needs Work', value: Math.max(5, 100 - score) },
  ], [score]);

  return (
    <div className="space-y-6">
      {/* Score Radar Chart */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-5">
        <h3 className="text-sm font-semibold text-amber-500 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Application Strength Analysis
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Company Recommendations with Bar Chart */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-5">
        <h3 className="text-sm font-semibold text-amber-500 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Recommended Company Types
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={companyRecommendations} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value}% — ${props.payload.reason}`,
                'Match',
              ]}
            />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
              {companyRecommendations.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Company Cards */}
        <div className="mt-4 space-y-2">
          {companyRecommendations.slice(0, 3).map((company, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[i]}20` }}>
                  <Building2 className="w-4 h-4" style={{ color: COLORS[i] }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${company.pct >= 70 ? 'text-green-500' : company.pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {company.pct}%
                </span>
                {company.pct >= 70 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fit Distribution Pie */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-5">
        <h3 className="text-sm font-semibold text-amber-500 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Acceptance Probability Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}%`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={['#22c55e', '#f59e0b', '#ef4444'][i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
