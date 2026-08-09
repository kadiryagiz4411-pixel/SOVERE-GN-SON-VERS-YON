import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, Target, BarChart3, Calendar,
  Lightbulb, Shield, Crown, ArrowUp,
} from 'lucide-react';

interface AnalysisReport {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  marketPosition: string;
  improvementAreas: Array<{
    area: string;
    currentScore: number;
    potentialScore: number;
    tip: string;
  }>;
  industryInsights: {
    demandLevel: string;
    averageRate: string;
    competitionLevel: string;
    growthTrend: string;
  };
  weeklyActionPlan: Array<{
    day: string;
    action: string;
    priority: string;
  }>;
}

interface DetailedAnalysisReportProps {
  plan: string;
  isElite: boolean;
}

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

const DEMAND_COLORS: Record<string, string> = {
  high: 'text-green-400 bg-green-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  low: 'text-red-400 bg-red-500/15',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export const DetailedAnalysisReport = ({ plan, isElite }: DetailedAnalysisReportProps) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);

  useEffect(() => {
    const loadReport = () => {
      const stored = sessionStorage.getItem('sovereign_analysis_report');
      if (stored) {
        try { setReport(JSON.parse(stored)); } catch { /* ignore */ }
      }
    };
    loadReport();
    window.addEventListener('analysisReportUpdated', loadReport);
    return () => window.removeEventListener('analysisReportUpdated', loadReport);
  }, []);

  if (!report) return null;

  const radarData = report.improvementAreas?.map((area) => ({
    metric: area.area,
    current: area.currentScore,
    potential: area.potentialScore,
  })) || [];

  const improvementBarData = report.improvementAreas?.map((area) => ({
    name: area.area,
    current: area.currentScore,
    potential: area.potentialScore,
    gap: area.potentialScore - area.currentScore,
  })) || [];

  const scoreDistribution = [
    { name: 'Strong', value: Math.round(report.overallScore * 0.5) },
    { name: 'Good', value: Math.round(report.overallScore * 0.3) },
    { name: 'Needs Work', value: Math.max(5, 100 - report.overallScore) },
  ];

  return (
    <div className={`rounded-xl border p-5 space-y-6 ${
      isElite
        ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card'
        : 'border-primary/30 bg-gradient-to-br from-primary/5 to-card'
    }`}>
      <div className="flex items-center gap-2">
        <BarChart3 className={`w-5 h-5 ${isElite ? 'text-amber-500' : 'text-primary'}`} />
        <h3 className="font-semibold text-foreground">
          {isElite ? '👑 Elite Analysis Report' : '📊 Detailed Analysis Report'}
        </h3>
      </div>

      {/* Overall Score + Market Position */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={report.overallScore >= 70 ? '#22c55e' : report.overallScore >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${report.overallScore * 2.64} ${264 - report.overallScore * 2.64}`}
              />
            </svg>
            <span className="absolute text-2xl font-bold text-foreground">{report.overallScore}</span>
          </div>
          <p className="text-sm font-medium text-foreground">Overall Score</p>
          <p className="text-xs text-muted-foreground mt-1">{report.marketPosition}</p>
        </div>

        {/* Industry Insights */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Industry Insights
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Demand', value: report.industryInsights?.demandLevel },
              { label: 'Avg Rate', value: report.industryInsights?.averageRate },
              { label: 'Competition', value: report.industryInsights?.competitionLevel },
              { label: 'Trend', value: report.industryInsights?.growthTrend },
            ].map((item, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-2">
                <span className="text-[10px] text-muted-foreground block">{item.label}</span>
                <span className={`text-xs font-semibold capitalize ${
                  DEMAND_COLORS[item.value || ''] ? DEMAND_COLORS[item.value!].split(' ')[0] : 'text-foreground'
                }`}>
                  {item.value || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <h4 className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Strengths
          </h4>
          <ul className="space-y-1.5">
            {report.strengths?.map((s, i) => (
              <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Areas to Improve
          </h4>
          <ul className="space-y-1.5">
            {report.weaknesses?.map((w, i) => (
              <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">!</span> {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Elite: Visual Charts */}
      {isElite && radarData.length > 0 && (
        <>
          {/* Radar Chart */}
          <div className="rounded-lg border border-amber-500/20 bg-card p-4">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Skill Gap Analysis
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="current" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} name="Current" />
                <Radar dataKey="potential" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" name="Potential" />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <span className="text-[10px] flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 inline-block rounded" /> Current
              </span>
              <span className="text-[10px] flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-green-500 inline-block rounded border-dashed" /> Potential
              </span>
            </div>
          </div>

          {/* Improvement Bar Chart */}
          <div className="rounded-lg border border-amber-500/20 bg-card p-4">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ArrowUp className="w-3.5 h-3.5" /> Growth Potential
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={improvementBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="current" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Current" />
                <Bar dataKey="gap" fill="#22c55e" radius={[0, 4, 4, 0]} name="Growth Gap" stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score Distribution Pie */}
          <div className="rounded-lg border border-amber-500/20 bg-card p-4">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Score Distribution
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={4} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {scoreDistribution.map((_, i) => (
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
        </>
      )}

      {/* Improvement Tips */}
      {report.improvementAreas && report.improvementAreas.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Improvement Tips
          </h4>
          <div className="space-y-2">
            {report.improvementAreas.map((area, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}>
                  <span className="text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                    {area.currentScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{area.area}</span>
                    <span className="text-[10px] text-green-400">→ {area.potentialScore}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{area.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Action Plan */}
      {report.weeklyActionPlan && report.weeklyActionPlan.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> Weekly Action Plan
          </h4>
          <div className="space-y-2">
            {report.weeklyActionPlan.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                <Badge variant="outline" className={`text-[10px] shrink-0 ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low}`}>
                  {item.day}
                </Badge>
                <span className="text-xs text-foreground/80 flex-1">{item.action}</span>
                <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low}`}>
                  {item.priority}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
