import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Eye,
  MessageCircle,
  Calendar,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Trophy,
  Share2,
  Gift,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { isElitePlan } from '@/lib/plans';
import { useLanguage } from '@/i18n/LanguageContext';

type OutcomeStatus = 'pending' | 'viewed' | 'replied' | 'interview-invited' | 'offer-received' | 'rejected';

interface TrackedApplication {
  id: string;
  jobTitle: string;
  company: string;
  status: OutcomeStatus;
  acceptanceScore?: number;
  createdAt: Date;
  outcomeLoggedAt?: Date;
}

interface ApplicationTrackerProps {
  currentPlan: string;
  userId?: string;
  onScoreIncrease?: (newScore: number) => void;
}

const STATUS_CONFIG: Record<OutcomeStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  'pending': {
    label: 'Pending',
    icon: XCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  },
  'viewed': {
    label: 'Viewed',
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  'replied': {
    label: 'Replied',
    icon: MessageCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  'interview-invited': {
    label: 'Interview Invited',
    icon: Calendar,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  'offer-received': {
    label: 'Offer Received',
    icon: Gift,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  'rejected': {
    label: 'Rejected',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
};

// Statuses shown as quick-select buttons (keep compact)
const QUICK_STATUSES: OutcomeStatus[] = ['pending', 'viewed', 'replied', 'interview-invited', 'offer-received'];

export const ApplicationTracker = ({ currentPlan, userId, onScoreIncrease }: ApplicationTrackerProps) => {
  const isElite = isElitePlan(currentPlan);
  const { language } = useLanguage();

  const [applications, setApplications] = useState<TrackedApplication[]>([
    {
      id: '1',
      jobTitle: 'Senior React Developer',
      company: 'TechCorp Inc',
      status: 'pending',
      acceptanceScore: 72,
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      id: '2',
      jobTitle: 'Full Stack Engineer',
      company: 'StartupXYZ',
      status: 'viewed',
      acceptanceScore: 85,
      createdAt: new Date(Date.now() - 86400000),
    },
  ]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [celebrationApp, setCelebrationApp] = useState<TrackedApplication | null>(null);

  const logOutcomeToDB = async (appId: string, status: OutcomeStatus, score?: number) => {
    if (!userId) return;
    try {
      await supabase.from('application_outcomes').upsert(
        {
          application_id: appId,
          user_id: userId,
          outcome: status,
          ats_score_at_apply: score ?? null,
          interview_invited: status === 'interview-invited',
          offer_received: status === 'offer-received',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'application_id' }
      );
    } catch {
      // Non-fatal — UI continues working even if DB write fails
    }
  };

  const handleStatusChange = async (appId: string, newStatus: OutcomeStatus) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    const oldStatus = app.status;

    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, outcomeLoggedAt: new Date() } : a));

    await logOutcomeToDB(appId, newStatus, app.acceptanceScore);

    if ((newStatus === 'interview-invited' || newStatus === 'offer-received') && oldStatus !== newStatus) {
      setCelebrationApp({ ...app, status: newStatus });
      if (newStatus === 'interview-invited') {
        toast.success('Interview invitation logged!', { description: 'This success is tracked for your career progress report.' });
        onScoreIncrease?.(Math.min((app.acceptanceScore ?? 80) + 5, 100));
      } else if (newStatus === 'offer-received') {
        toast.success('Offer received — congratulations!', { description: 'Your success has been recorded. Share the achievement!' });
      }
      setTimeout(() => setCelebrationApp(null), 4000);
    } else {
      toast.success(`Status → ${STATUS_CONFIG[newStatus].label}`);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">Application Outcome Tracker</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {applications.length}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Celebration banner */}
      {celebrationApp && (
        <div className={`px-4 py-4 border-t border-border animate-pulse ${
          celebrationApp.status === 'offer-received'
            ? 'bg-gradient-to-r from-primary/20 via-amber-500/20 to-primary/20'
            : 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20'
        }`}>
          <div className="flex items-center justify-center gap-3">
            {celebrationApp.status === 'offer-received'
              ? <PartyPopper className="w-6 h-6 text-primary animate-bounce" />
              : <Trophy className="w-6 h-6 text-amber-500 animate-bounce" />
            }
            <div className="text-center">
              <p className={`font-bold ${celebrationApp.status === 'offer-received' ? 'text-primary' : 'text-amber-500'}`}>
                {celebrationApp.status === 'offer-received' ? 'Offer Received!' : 'Interview Invitation!'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{celebrationApp.company} — {celebrationApp.jobTitle}</p>
            </div>
            {celebrationApp.status === 'offer-received'
              ? <PartyPopper className="w-6 h-6 text-primary animate-bounce" />
              : <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
            }
          </div>
          {isElite && (
            <div className="mt-3 flex justify-center">
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                <Share2 className="w-3 h-3 mr-2" />
                Share Success Snapshot
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Application list */}
      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {applications.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>No tracked applications yet.</p>
              <p className="text-sm mt-1">Save a proposal to start tracking!</p>
            </div>
          ) : (
            applications.map((app) => {
              const currentConfig = STATUS_CONFIG[app.status];
              const StatusIcon = currentConfig.icon;
              return (
                <div key={app.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{app.jobTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                      {app.acceptanceScore && (
                        <div className="mt-1.5">
                          {isElite ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                                  style={{ width: `${app.acceptanceScore}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-amber-500 shrink-0">{app.acceptanceScore}%</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-primary">{app.acceptanceScore}% match</span>
                          )}
                        </div>
                      )}
                      {/* Current status badge */}
                      <div className={`mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${currentConfig.bgColor} ${currentConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {currentConfig.label}
                      </div>
                    </div>

                    {/* Quick-select status buttons */}
                    <div className="flex flex-wrap gap-1 max-w-[130px] justify-end">
                      {QUICK_STATUSES.map((status) => {
                        const config = STATUS_CONFIG[status];
                        const Icon = config.icon;
                        const isActive = app.status === status;
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(app.id, status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive ? `${config.bgColor} ${config.color}` : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                            title={config.label}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="px-4 py-3 bg-muted/20">
            <p className="text-[10px] text-muted-foreground text-center">
              Track outcomes to measure your application success rate
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
