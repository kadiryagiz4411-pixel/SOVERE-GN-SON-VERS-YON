import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { isElitePlan } from '@/lib/plans';
import { useLanguage } from '@/i18n/LanguageContext';

interface TrackedApplication {
  id: string;
  jobTitle: string;
  company: string;
  status: 'no-reply' | 'viewed' | 'replied' | 'interview';
  acceptanceScore?: number;
  createdAt: Date;
}

interface ApplicationTrackerProps {
  currentPlan: string;
  onScoreIncrease?: (newScore: number) => void;
}

const STATUS_CONFIG = {
  'no-reply': { 
    label: 'No Reply', 
    icon: XCircle, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50'
  },
  'viewed': { 
    label: 'Viewed', 
    icon: Eye, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  'replied': { 
    label: 'Replied', 
    icon: MessageCircle, 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  'interview': { 
    label: 'Interview', 
    icon: Calendar, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
};

export const ApplicationTracker = ({ currentPlan, onScoreIncrease }: ApplicationTrackerProps) => {
  const isElite = isElitePlan(currentPlan);
  const [applications, setApplications] = useState<TrackedApplication[]>([
    // Demo data - in production this would come from the database
    {
      id: '1',
      jobTitle: 'Senior React Developer',
      company: 'TechCorp Inc',
      status: 'no-reply',
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{oldScore: number; newScore: number} | null>(null);

  const handleStatusChange = (appId: string, newStatus: TrackedApplication['status']) => {
    const app = applications.find(a => a.id === appId);
    const oldStatus = app?.status;
    
    setApplications(prev => 
      prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      )
    );

    // Celebration for "Replied" status
    if (newStatus === 'replied' && oldStatus !== 'replied') {
      const oldScore = app?.acceptanceScore || 70;
      const newScore = Math.min(oldScore + Math.floor(Math.random() * 8) + 3, 100);
      
      setCelebrationData({ oldScore, newScore });
      setShowCelebration(true);
      
      // Update the application's score
      setApplications(prev => 
        prev.map(a => 
          a.id === appId ? { ...a, acceptanceScore: newScore } : a
        )
      );
      
      onScoreIncrease?.(newScore);
      
      // Hide celebration after animation
      setTimeout(() => {
        setShowCelebration(false);
        setCelebrationData(null);
      }, 3000);
    }

    toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
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
          <span className="font-medium text-foreground">Application Tracker</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {applications.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Celebration Overlay */}
      {showCelebration && celebrationData && (
        <div className={`px-4 py-4 border-t border-border ${
          isElite 
            ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20' 
            : 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20'
        } animate-pulse`}>
          <div className="flex items-center justify-center gap-3">
            <Trophy className={`w-6 h-6 ${isElite ? 'text-amber-500' : 'text-green-500'} animate-bounce`} />
            <div className="text-center">
              <p className={`font-bold ${isElite ? 'text-amber-500' : 'text-green-500'}`}>
                Reply received!
              </p>
              <div className="flex items-center gap-2 justify-center mt-1">
                <span className="text-muted-foreground">{celebrationData.oldScore}%</span>
                <Sparkles className="w-4 h-4 text-primary" />
                <span className={`font-bold ${isElite ? 'text-amber-500' : 'text-green-500'}`}>
                  {celebrationData.newScore}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your acceptance score increased!
              </p>
            </div>
            <Trophy className={`w-6 h-6 ${isElite ? 'text-amber-500' : 'text-green-500'} animate-bounce`} />
          </div>
          
          {/* Share prompt for Elite users */}
          {isElite && (
            <div className="mt-3 flex justify-center">
              <Button 
                variant="outline" 
                size="sm"
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              >
                <Share2 className="w-3 h-3 mr-2" />
                Share Success Snapshot
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Applications List */}
      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {applications.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>No tracked applications yet.</p>
              <p className="text-sm mt-1">Save a proposal to start tracking!</p>
            </div>
          ) : (
            applications.map((app) => {
              return (
                <div key={app.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{app.jobTitle}</p>
                      <p className="text-sm text-muted-foreground truncate">{app.company}</p>
                      
                      {/* Score Display - Visual for Elite */}
                      {app.acceptanceScore && (
                        <div className="mt-2">
                          {isElite ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                                  style={{ width: `${app.acceptanceScore}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-amber-500">
                                {app.acceptanceScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-primary">
                              {app.acceptanceScore}% acceptance
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Status Selector */}
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
                        const config = STATUS_CONFIG[status];
                        const Icon = config.icon;
                        const isActive = app.status === status;
                        
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(app.id, status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive 
                                ? `${config.bgColor} ${config.color}` 
                                : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                            title={config.label}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* CTA */}
          <div className="px-4 py-3 bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Track your applications to see what's working
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
