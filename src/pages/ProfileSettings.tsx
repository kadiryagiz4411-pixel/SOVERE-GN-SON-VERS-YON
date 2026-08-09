import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { UserStatsCard } from '@/components/profile/UserStatsCard';
import { PortfolioManager, type PortfolioProject } from '@/components/dashboard/PortfolioManager';
import { MobileBottomNav, SwipeablePageWrapper } from '@/components/MobileBottomNav';
import { useLanguage } from '@/i18n/LanguageContext';
import { User } from '@supabase/supabase-js';
import {
  Crown,
  ArrowLeft,
  Save,
  Loader2,
  User as UserIcon,
  Briefcase,
  DollarSign,
  Code,
  History,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  Building2,
  Key,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const ProfileSettings = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgKey, setOrgKey] = useState('');
  const [orgKeyLoading, setOrgKeyLoading] = useState(false);
  const [orgRedeemed, setOrgRedeemed] = useState(false);

  const { profile, loading: profileLoading, updateProfile, refreshProfile } = useProfile(user);

  const handleRedeemOrgKey = async () => {
    if (!orgKey.trim() || !user) return;
    setOrgKeyLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_org_license', {
        _user_id: user.id,
        _key: orgKey.trim().toUpperCase(),
      });
      if (error) throw error;
      if (data === 'ok') {
        toast.success('Organization license activated! You now have B2B Enterprise access.');
        setOrgRedeemed(true);
        refreshProfile();
      } else if (data === 'invalid_key') {
        toast.error('Invalid license key. Please check the key and try again.');
      } else if (data === 'expired') {
        toast.error('This license key has expired. Contact your organization admin.');
      } else if (data === 'no_seats') {
        toast.error('No available seats on this license. Contact your organization admin.');
      } else if (data === 'already_member') {
        toast.info('You are already a member of an organization.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Failed to redeem license key.');
    } finally {
      setOrgKeyLoading(false);
    }
  };

  const isTr = language === 'tr';

  const labels = {
    headerTitle: isTr ? 'Profil Ayarları' : 'Profile Settings',
    personalizeTitle: isTr ? 'Profilini Kişiselleştir' : 'Personalize Your Profile',
    personalizeSubtitle: isTr ? 'AI tekliflerini kişiselleştirmek için beceri ve deneyimlerini ekle' : 'Add your skills and experience to generate more personalized proposals',
    fullName: isTr ? 'Ad Soyad' : 'Full Name',
    skills: isTr ? 'Beceriler' : 'Skills',
    skillsHint: isTr ? 'Becerileri virgülle ayırın' : 'Separate skills with commas',
    experience: isTr ? 'Deneyim Özeti' : 'Experience Summary',
    hourlyRate: isTr ? 'Saatlik Ücret (USD)' : 'Hourly Rate (USD)',
    bio: isTr ? 'Kısa Biyografi' : 'Short Bio',
    bioPlaceholder: isTr ? 'Tekliflerde kullanılacak kısa bir tanıtım...' : 'A brief introduction about yourself that will be used in proposals...',
    careerGoals: isTr ? 'Kariyer Hedefleri' : 'Career Goals',
    careerGoalsSubtitle: isTr ? 'Yol haritanızı ve tekliflerinizi kişiselleştirmemize yardım edin.' : 'Help us personalize your roadmap and proposals.',
    workType: isTr ? 'Ne tür bir iş arıyorsunuz?' : 'What type of work are you looking for?',
    expLevel: isTr ? 'Deneyim seviyeniz?' : 'Experience level?',
    challenge: isTr ? 'En büyük zorluğunuz?' : 'Biggest challenge?',
    volume: isTr ? 'Haftalık başvuru hacmi?' : 'Weekly application volume?',
    saving: isTr ? 'Kaydediliyor...' : 'Saving...',
    save: isTr ? 'Profili Kaydet' : 'Save Profile',
    viewHistory: isTr ? 'Geçmişi Görüntüle' : 'View History',
    saved: isTr ? 'Profil başarıyla kaydedildi!' : 'Profile saved successfully!',
    saveFailed: isTr ? 'Profil kaydedilemedi' : 'Failed to save profile',
    memberBadge: isTr ? 'Üye' : 'Member',
    tips: isTr ? '💡 Profil İpuçları' : '💡 Profile Tips',
    tip1: isTr ? 'Güven oluşturmak için profesyonel bir fotoğraf ekleyin' : 'Add a professional photo to increase trust',
    tip2: isTr ? 'Hedef işlerinizle eşleşen spesifik beceriler ekleyin' : 'Add specific skills that match your target jobs',
    tip3: isTr ? 'Yıllarca deneyim ve önemli projeleri ekleyin' : 'Include years of experience and notable projects',
    tip4: isTr ? 'Saatlik ücretiniz AI\'nın uygun fiyatlandırma önermesine yardımcı olur' : 'Your hourly rate helps AI suggest appropriate pricing',
    workOptions: isTr
      ? ['Serbest / Sözleşmeli', 'Tam Zamanlı İstihdam', 'Yarı Zamanlı / Uzaktan', 'Danışmanlık']
      : ['Freelance / Contract', 'Full-time Employment', 'Part-time / Remote', 'Consulting'],
    expOptions: isTr
      ? ['0-2 yıl', '3-5 yıl', '5-10 yıl', '10+ yıl']
      : ['0-2 years', '3-5 years', '5-10 years', '10+ years'],
    challengeOptions: isTr
      ? ['Yanıt almak', 'Öne çıkmak', 'Teklif yazmak', 'Fırsat bulmak']
      : ['Getting responses', 'Standing out', 'Writing proposals', 'Finding opportunities'],
    volumeOptions: ['1-5', '5-15', '15-30', '30+'],
  };

  const [formData, setFormData] = useState({
    full_name: '',
    skills: '',
    experience: '',
    hourly_rate: '',
    bio: '',
  });

  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);

  const [onboardingData, setOnboardingData] = useState({
    onboarding_role: '',
    onboarding_experience: '',
    onboarding_goal: '',
    onboarding_volume: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        skills: profile.skills?.join(', ') || '',
        experience: profile.experience || '',
        hourly_rate: profile.hourly_rate?.toString() || '',
        bio: profile.bio || '',
      });
      setOnboardingData({
        onboarding_role: (profile as any).onboarding_role || '',
        onboarding_experience: (profile as any).onboarding_experience || '',
        onboarding_goal: (profile as any).onboarding_goal || '',
        onboarding_volume: (profile as any).onboarding_volume || '',
      });
      // Load portfolio
      try {
        const portfolioData = (profile as any).portfolio_projects;
        if (Array.isArray(portfolioData)) {
          setPortfolioProjects(portfolioData);
        }
      } catch { /* ignore */ }
    }
  }, [profile]);

  const handleAvatarUpdate = (_url: string) => {
    refreshProfile();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const skillsArray = formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const { error } = await updateProfile({
      full_name: formData.full_name || null,
      skills: skillsArray.length > 0 ? skillsArray : null,
      experience: formData.experience || null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      bio: formData.bio || null,
      portfolio_projects: portfolioProjects,
      onboarding_role: onboardingData.onboarding_role || null,
      onboarding_experience: onboardingData.onboarding_experience || null,
      onboarding_goal: onboardingData.onboarding_goal || null,
      onboarding_volume: onboardingData.onboarding_volume || null,
      onboarding_completed: !!(onboardingData.onboarding_role && onboardingData.onboarding_goal),
    } as any);

    setSaving(false);

    if (error) {
      toast.error(labels.saveFailed);
    } else {
      toast.success(labels.saved);
    }
  };


  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SwipeablePageWrapper>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
                <Crown className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">{labels.headerTitle}</span>
            </div>
          </div>
          <Link to="/proposals">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">{labels.viewHistory}</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-2xl">
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8 pb-6 border-b border-border">
            {user && (
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                fullName={profile?.full_name || null}
                onAvatarUpdate={handleAvatarUpdate}
              />
            )}
            {profile?.subscription_plan && profile.subscription_plan !== 'basic' && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary capitalize">
                  {profile.subscription_plan} {labels.memberBadge}
                </span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">{labels.personalizeTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">{labels.personalizeSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                {labels.fullName}
              </Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills" className="flex items-center gap-2">
                <Code className="w-4 h-4 text-muted-foreground" />
                {labels.skills}
              </Label>
              <Input
                id="skills"
                placeholder="React, Node.js, Python, UI/UX Design"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{labels.skillsHint}</p>
            </div>

            {/* Experience */}
            <div className="space-y-2">
              <Label htmlFor="experience" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                {labels.experience}
              </Label>
              <Textarea
                id="experience"
                placeholder={isTr ? '5+ yıllık Full Stack Geliştirici deneyimi...' : '5+ years as a Full Stack Developer...'}
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label htmlFor="hourly_rate" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                {labels.hourlyRate}
              </Label>
              <Input
                id="hourly_rate"
                type="number"
                placeholder="75"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">{labels.bio}</Label>
              <Textarea
                id="bio"
                placeholder={labels.bioPlaceholder}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Portfolio / Projects */}
            <PortfolioManager
              projects={portfolioProjects}
              onChange={setPortfolioProjects}
            />

            {/* Onboarding / Career Goals */}
            <div className="pt-6 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {labels.careerGoals}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{labels.careerGoalsSubtitle}</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    {labels.workType}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {labels.workOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setOnboardingData(d => ({ ...d, onboarding_role: opt }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          onboardingData.onboarding_role === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    {labels.expLevel}
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {labels.expOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setOnboardingData(d => ({ ...d, onboarding_experience: opt }))}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          onboardingData.onboarding_experience === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    {labels.challenge}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {labels.challengeOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setOnboardingData(d => ({ ...d, onboarding_goal: opt }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          onboardingData.onboarding_goal === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {labels.volume}
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {labels.volumeOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setOnboardingData(d => ({ ...d, onboarding_volume: opt }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          onboardingData.onboarding_volume === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" variant="gold" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {labels.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {labels.save}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* User Stats & Level Card */}
        {user && profile && (
          <div className="mt-6">
            <UserStatsCard
              userId={user.id}
              fullName={profile.full_name || null}
              plan={profile.subscription_plan || 'basic'}
              avatarUrl={profile.avatar_url || null}
              skills={profile.skills || null}
            />
          </div>
        )}

        {/* Organization License */}
        {!orgRedeemed && !(profile as any)?.org_id && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Have an Organization License Key?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bootcamp students, agency clients, and corporate users — enter your key to activate institutional access.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. BOOTCAMP-2026-XYZ"
                  value={orgKey}
                  onChange={(e) => setOrgKey(e.target.value.toUpperCase())}
                  className="pl-9 text-sm font-mono tracking-wider"
                  disabled={orgKeyLoading}
                />
              </div>
              <Button
                variant="default"
                onClick={handleRedeemOrgKey}
                disabled={!orgKey.trim() || orgKeyLoading}
              >
                {orgKeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
              </Button>
            </div>
          </div>
        )}

        {(orgRedeemed || (profile as any)?.org_id) && (
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Organization License Active</p>
              <p className="text-xs text-muted-foreground">B2B Enterprise access granted via institutional license.</p>
            </div>
          </div>
        )}

        {/* Tips Card */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-sm font-medium text-primary mb-2">{labels.tips}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {labels.tip1}</li>
            <li>• {labels.tip2}</li>
            <li>• {labels.tip3}</li>
            <li>• {labels.tip4}</li>
          </ul>
        </div>
        
        {/* Spacer for mobile bottom nav */}
        <div className="h-20 lg:hidden" />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
    </SwipeablePageWrapper>
  );
};

export default ProfileSettings;
