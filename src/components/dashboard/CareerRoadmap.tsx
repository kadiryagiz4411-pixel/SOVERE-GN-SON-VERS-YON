import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Map, Target, Briefcase, TrendingUp, Clock, CheckCircle, Loader2, ArrowRight, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface CareerRoadmapProps {
  userId: string;
  profile: {
    skills?: string[] | null;
    experience?: string | null;
    onboarding_role?: string | null;
    onboarding_experience?: string | null;
    onboarding_goal?: string | null;
    onboarding_volume?: string | null;
    career_roadmap?: any;
  };
  onRoadmapGenerated: () => void;
}

interface RoadmapData {
  summary: string;
  strengths: string[];
  focusAreas: string[];
  weeklyPlan: Array<{
    week: string;
    goal: string;
    actions: string[];
  }>;
  targetRoles: string[];
  expectedOutcome: string;
}

export const CareerRoadmap = ({ userId, profile, onRoadmapGenerated }: CareerRoadmapProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const roadmap: RoadmapData | null = profile.career_roadmap as RoadmapData | null;

  const hasOnboardingData = profile.onboarding_role || profile.onboarding_goal;

  const generateRoadmap = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-roadmap`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            skills: profile.skills,
            experience: profile.experience,
            onboarding_role: profile.onboarding_role,
            onboarding_experience: profile.onboarding_experience,
            onboarding_goal: profile.onboarding_goal,
            onboarding_volume: profile.onboarding_volume,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate roadmap');
      }

      const data = await response.json();
      
      // Save roadmap to profile
      await supabase
        .from('profiles')
        .update({ career_roadmap: data.roadmap })
        .eq('user_id', userId);

      onRoadmapGenerated();
      toast.success('Career roadmap generated!');
    } catch (err) {
      console.error('Roadmap error:', err);
      toast.error('Failed to generate roadmap');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!roadmap) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-6 text-center">
        <Map className="w-10 h-10 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Your Personalized Career Roadmap
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          {hasOnboardingData
            ? 'Based on your profile and goals, we\'ll create a step-by-step plan to maximize your application success.'
            : 'Complete your profile and answer the onboarding questions to get a personalized career strategy.'}
        </p>
        <Button
          variant="gold"
          onClick={generateRoadmap}
          disabled={isGenerating || !hasOnboardingData}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate My Roadmap
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Map className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Your Career Roadmap</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{roadmap.summary}</p>
      </div>

      {/* Strengths & Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Your Strengths
          </h4>
          <ul className="space-y-2">
            {roadmap.strengths.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            Focus Areas
          </h4>
          <ul className="space-y-2">
            {roadmap.focusAreas.map((f, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Weekly Plan */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Action Plan
        </h4>
        <div className="space-y-4">
          {roadmap.weeklyPlan.map((week, i) => (
            <div key={i} className="relative pl-6 pb-4 border-l-2 border-primary/20 last:border-0 last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary" />
              <p className="text-xs font-semibold text-primary mb-1">{week.week}</p>
              <p className="text-sm font-medium text-foreground mb-2">{week.goal}</p>
              <ul className="space-y-1">
                {week.actions.map((a, j) => (
                  <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Target Roles */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          Target Roles
        </h4>
        <div className="flex flex-wrap gap-2">
          {roadmap.targetRoles.map((role, i) => (
            <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Expected Outcome */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
        <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Expected Outcome
        </h4>
        <p className="text-sm text-muted-foreground">{roadmap.expectedOutcome}</p>
      </div>

      {/* Regenerate */}
      <Button variant="outline" size="sm" onClick={generateRoadmap} disabled={isGenerating} className="w-full">
        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Regenerate Roadmap
      </Button>
    </div>
  );
};
