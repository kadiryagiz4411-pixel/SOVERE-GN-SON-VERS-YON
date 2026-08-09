import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Trophy, FileText, CheckCircle, Star, Share2, Check, Award, Flame, Zap, Rocket, Crown, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UserStats {
  totalProposals: number;
  sentProposals: number;
  acceptedProposals: number;
  memberSinceMonths: number;
  memberSinceDate: string;
}

interface UserStatsCardProps {
  userId: string;
  fullName: string | null;
  plan: string;
  avatarUrl: string | null;
  skills: string[] | null;
}

interface LevelInfo {
  label: string;
  labelTr: string;
  emoji: string;
  color: string;
  icon: typeof Trophy;
  minProposals: number;
}

const LEVELS: LevelInfo[] = [
  { label: 'Newcomer', labelTr: 'Yeni Başlayan', emoji: '🌱', color: 'text-green-500', icon: Zap, minProposals: 0 },
  { label: 'Rising', labelTr: 'Yükselen', emoji: '📈', color: 'text-primary', icon: Rocket, minProposals: 10 },
  { label: 'Advanced', labelTr: 'İleri', emoji: '🔥', color: 'text-orange-500', icon: Flame, minProposals: 25 },
  { label: 'Expert', labelTr: 'Uzman', emoji: '⭐', color: 'text-amber-500', icon: Award, minProposals: 50 },
  { label: 'Legend', labelTr: 'Efsane', emoji: '🏆', color: 'text-amber-400', icon: Crown, minProposals: 100 },
];

function getUserLevel(total: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (total >= LEVELS[i].minProposals) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(total: number): LevelInfo | null {
  const current = getUserLevel(total);
  const idx = LEVELS.indexOf(current);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

interface Badge {
  id: string;
  label: string;
  labelTr: string;
  emoji: string;
  condition: (s: UserStats) => boolean;
}

const BADGES: Badge[] = [
  { id: 'first', label: 'First Proposal', labelTr: 'İlk Teklif', emoji: '🎉', condition: s => s.totalProposals >= 1 },
  { id: 'ten', label: '10 Proposals', labelTr: '10 Teklif', emoji: '🔟', condition: s => s.totalProposals >= 10 },
  { id: 'sender', label: 'Active Sender', labelTr: 'Aktif Gönderici', emoji: '📤', condition: s => s.sentProposals >= 5 },
  { id: 'accepted', label: 'First Acceptance', labelTr: 'İlk Kabul', emoji: '✅', condition: s => s.acceptedProposals >= 1 },
  { id: 'five_acc', label: '5 Accepted', labelTr: '5 Kabul', emoji: '🏅', condition: s => s.acceptedProposals >= 5 },
  { id: 'prolific', label: 'Prolific Writer', labelTr: 'Üretken Yazar', emoji: '✍️', condition: s => s.totalProposals >= 50 },
  { id: 'legend', label: 'Legend Status', labelTr: 'Efsane Statüsü', emoji: '👑', condition: s => s.totalProposals >= 100 },
  { id: 'sniper', label: 'Sniper (70%+)', labelTr: 'Keskin Nişancı (%70+)', emoji: '🎯', condition: s => s.sentProposals >= 5 && (s.acceptedProposals / s.sentProposals) >= 0.7 },
];

export const UserStatsCard = ({ userId, fullName, plan, avatarUrl, skills }: UserStatsCardProps) => {
  const { language } = useLanguage();
  const [stats, setStats] = useState<UserStats>({ totalProposals: 0, sentProposals: 0, acceptedProposals: 0, memberSinceMonths: 0, memberSinceDate: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const [proposalsRes, profileRes] = await Promise.all([
        supabase.from('proposals').select('status').eq('user_id', userId),
        supabase.from('profiles').select('created_at').eq('user_id', userId).maybeSingle(),
      ]);

      const data = proposalsRes.data || [];
      const createdAt = profileRes.data?.created_at;
      const memberMonths = createdAt ? Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;

      setStats({
        totalProposals: data.length,
        sentProposals: data.filter(p => p.status === 'sent').length,
        acceptedProposals: data.filter(p => p.status === 'accepted').length,
        memberSinceMonths: memberMonths,
        memberSinceDate: createdAt ? new Date(createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', year: 'numeric' }) : '',
      });
    };
    fetchStats();
  }, [userId, language]);

  const level = getUserLevel(stats.totalProposals);
  const nextLevel = getNextLevel(stats.totalProposals);
  const levelLabel = language === 'tr' ? level.labelTr : level.label;
  const earnedBadges = BADGES.filter(b => b.condition(stats));
  const acceptanceRate = stats.sentProposals > 0 ? Math.round((stats.acceptedProposals / stats.sentProposals) * 100) : 0;
  const isTopPerformer = stats.acceptedProposals >= 5 || acceptanceRate >= 70;
  const progressToNext = nextLevel ? Math.min(100, Math.round(((stats.totalProposals - level.minProposals) / (nextLevel.minProposals - level.minProposals)) * 100)) : 100;
  const remaining = nextLevel ? nextLevel.minProposals - stats.totalProposals : 0;

  const txt = language === 'tr' ? {
    level: 'Seviye', proposals: 'Teklifler', sent: 'Gönderilen', accepted: 'Kabul Edilen',
    share: 'Profili Paylaş', copied: 'Kopyalandı!', stats: 'İstatistiklerin & Seviyen',
    bestUser: 'En İyi Kullanıcı', badges: 'Kazanılan Rozetler', nextLevel: 'Sonraki Seviye',
    moreNeeded: 'kaldı', acceptanceRate: 'Kabul Oranı', memberSince: 'Üyelik Süresi',
    months: 'ay', since: 'tarihinden beri',
  } : {
    level: 'Level', proposals: 'Proposals', sent: 'Sent', accepted: 'Accepted',
    share: 'Share Profile', copied: 'Copied!', stats: 'Your Stats & Level',
    bestUser: 'Top Performer', badges: 'Badges Earned', nextLevel: 'Next Level',
    moreNeeded: 'more to go', acceptanceRate: 'Acceptance Rate', memberSince: 'Member Since',
    months: 'months', since: 'since',
  };

  const handleShare = async () => {
    const shareText = language === 'tr'
      ? `🚀 ${fullName || 'User'} Sovereign'da ${levelLabel} seviyesinde!\n📝 ${stats.totalProposals} teklif\n✅ ${stats.acceptedProposals} kabul\n🏅 ${earnedBadges.length} rozet\n📅 ${stats.memberSinceMonths} aydır üye\n\nhttps://www.sovereignapp.pro`
      : `🚀 ${fullName || 'User'} is a ${levelLabel} on Sovereign!\n📝 ${stats.totalProposals} proposals\n✅ ${stats.acceptedProposals} accepted\n🏅 ${earnedBadges.length} badges\n📅 Member for ${stats.memberSinceMonths} months\n\nhttps://www.sovereignapp.pro`;

    if (navigator.share) {
      try { await navigator.share({ text: shareText }); return; } catch { /* fallback */ }
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success(txt.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {txt.stats}
        </h2>
        {isTopPerformer && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-500" />
            {txt.bestUser}
          </span>
        )}
      </div>

      {/* Level Badge */}
      <div className="text-center pb-6 border-b border-border">
        <div className="text-4xl mb-2 animate-float">{level.emoji}</div>
        <p className={`text-xl font-bold ${level.color}`}>{levelLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{txt.level}</p>
        {nextLevel && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{txt.nextLevel}: {language === 'tr' ? nextLevel.labelTr : nextLevel.label}</span>
              <span>{remaining} {txt.moreNeeded}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all" style={{ width: `${progressToNext}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid - 4 columns now */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground">{stats.totalProposals}</p>
          <p className="text-xs text-muted-foreground">{txt.proposals}</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
            <Share2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-foreground">{stats.sentProposals}</p>
          <p className="text-xs text-muted-foreground">{txt.sent}</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xl font-bold text-foreground">{stats.acceptedProposals}</p>
          <p className="text-xs text-muted-foreground">{txt.accepted}</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-foreground">{stats.memberSinceMonths}</p>
          <p className="text-xs text-muted-foreground">{txt.months}</p>
        </div>
      </div>

      {/* Member Since Date */}
      {stats.memberSinceDate && (
        <div className="text-center text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 inline mr-1" />
          {txt.memberSince}: {stats.memberSinceDate}
        </div>
      )}

      {/* Acceptance Rate Bar */}
      {stats.sentProposals > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{txt.acceptanceRate}</span>
            <span className="font-medium text-foreground">{acceptanceRate}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all" style={{ width: `${acceptanceRate}%` }} />
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          {txt.badges} ({earnedBadges.length}/{BADGES.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((badge) => {
            const earned = badge.condition(stats);
            return (
              <div
                key={badge.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  earned ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/50 text-muted-foreground/50 border border-transparent'
                }`}
                title={language === 'tr' ? badge.labelTr : badge.label}
              >
                <span className={earned ? '' : 'grayscale opacity-40'}>{badge.emoji}</span>
                <span>{language === 'tr' ? badge.labelTr : badge.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Share */}
      <Button variant="outline" className="w-full" onClick={handleShare}>
        {copied ? (<><Check className="w-4 h-4 mr-2 text-green-500" />{txt.copied}</>) : (<><Share2 className="w-4 h-4 mr-2" />{txt.share}</>)}
      </Button>
    </div>
  );
};
