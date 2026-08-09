import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ExternalLink, Briefcase, Clock, Users, TrendingUp,
  Loader2, RefreshCw, Star, Zap, Crown, ChevronDown, ChevronUp,
} from 'lucide-react';

interface JobListing {
  title: string;
  platform: string;
  company: string;
  budget: string;
  description: string;
  matchScore: number;
  matchReason: string;
  skills: string[];
  urgency: 'high' | 'medium' | 'low';
  postedAgo: string;
  applicants: number;
  applyUrl: string;
  // Elite extras
  strategyTip?: string;
  competitorAnalysis?: string;
  bestTimeToApply?: string;
}

interface JobRecommendationsProps {
  proposal: string;
  jobDescription: string;
  plan: string;
  userSegment?: string | null;
  platformType?: string;
  professionCluster?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Upwork: 'bg-green-500/15 text-green-500 border-green-500/30',
  Fiverr: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  LinkedIn: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  Indeed: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
  Toptal: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
  Freelancer: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
};

const URGENCY_STYLES: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-amber-500/15 text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

export const JobRecommendations = ({
  proposal, jobDescription, plan, userSegment, platformType, professionCluster,
}: JobRecommendationsProps) => {
  const [listings, setListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const isElite = plan === 'elite';
  const isPro = plan === 'pro';

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in'); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            proposal, jobDescription, userSegment, platformType, professionCluster,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || 'Failed to fetch recommendations');
        return;
      }

      const data = await response.json();
      setListings(data.recommendations || []);
      setLoaded(true);
      
      // Store analysis report in sessionStorage for DetailedAnalysisReport
      if (data.analysisReport) {
        sessionStorage.setItem('sovereign_analysis_report', JSON.stringify(data.analysisReport));
        window.dispatchEvent(new Event('analysisReportUpdated'));
      }

      toast.success(`${data.recommendations?.length || 0} job recommendations loaded!`);
    } catch (err) {
      console.error('Recommendations error:', err);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount with debounce to avoid duplicate calls
  useEffect(() => {
    if (!loaded && proposal && (isPro || isElite)) {
      const timer = setTimeout(() => {
        if (!loaded) fetchRecommendations();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [proposal]);

  const visibleListings = showAll ? listings : listings.slice(0, 6);

  if (!isPro && !isElite) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-500/5';
    if (score >= 60) return 'from-amber-500/20 to-amber-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  return (
    <div className={`rounded-xl border p-5 ${
      isElite
        ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card'
        : 'border-primary/30 bg-gradient-to-br from-primary/5 to-card'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className={`w-5 h-5 ${isElite ? 'text-amber-500' : 'text-primary'}`} />
          <h3 className="font-semibold text-foreground">
            {isElite ? '👑 Elite Job Matches' : '🎯 Recommended Jobs For You'}
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {isElite ? '15 listings' : '6 listings'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRecommendations}
          disabled={loading}
          className="text-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-1 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {loading && !loaded ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Finding best matches for your profile...</p>
          </div>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-8">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">No recommendations yet. Generate a proposal first.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleListings.map((job, idx) => (
              <div
                key={idx}
                className={`rounded-lg border border-border bg-card hover:border-primary/30 transition-all cursor-pointer ${
                  expandedIdx === idx ? 'ring-1 ring-primary/20' : ''
                }`}
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PLATFORM_COLORS[job.platform] || 'bg-muted text-muted-foreground'}`}>
                          {job.platform}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${URGENCY_STYLES[job.urgency] || URGENCY_STYLES.low}`}>
                          {job.urgency === 'high' ? '🔥 Urgent' : job.urgency === 'medium' ? '⚡ Active' : '📋 Open'}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {job.postedAgo}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground truncate">{job.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.company} • {job.budget}</p>
                    </div>

                    <div className={`flex flex-col items-center justify-center min-w-[60px] rounded-lg p-2 bg-gradient-to-b ${getScoreBg(job.matchScore)}`}>
                      <span className={`text-lg font-bold ${getScoreColor(job.matchScore)}`}>
                        {job.matchScore}%
                      </span>
                      <span className="text-[9px] text-muted-foreground">match</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.description}</p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {job.skills?.slice(0, 4).map((skill, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                      <Users className="w-3 h-3" /> {job.applicants} applicants
                    </span>
                  </div>

                  {/* Match reason */}
                  <div className="mt-2 flex items-start gap-1.5">
                    <TrendingUp className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-green-500/80">{job.matchReason}</span>
                  </div>
                </div>

                {/* Expanded: Elite extras + Apply button */}
                {expandedIdx === idx && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-2">
                    {isElite && job.strategyTip && (
                      <div className="flex items-start gap-2">
                        <Crown className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-semibold text-amber-500 uppercase">Strategy Tip</span>
                          <p className="text-xs text-foreground/80">{job.strategyTip}</p>
                        </div>
                      </div>
                    )}
                    {isElite && job.competitorAnalysis && (
                      <div className="flex items-start gap-2">
                        <Zap className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-semibold text-purple-400 uppercase">Competition</span>
                          <p className="text-xs text-foreground/80">{job.competitorAnalysis}</p>
                        </div>
                      </div>
                    )}
                    {isElite && job.bestTimeToApply && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-semibold text-blue-400 uppercase">Best Time</span>
                          <p className="text-xs text-foreground/80">{job.bestTimeToApply}</p>
                        </div>
                      </div>
                    )}
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply on {job.platform}
                      <span className={`text-xs font-bold ${getScoreColor(job.matchScore)}`}>
                        {job.matchScore}% match
                      </span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isElite && listings.length > 6 && (
            <Button
              variant="ghost"
              className="w-full mt-3 text-sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4 mr-1" /> Show Less</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-1" /> Show All {listings.length} Listings</>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
