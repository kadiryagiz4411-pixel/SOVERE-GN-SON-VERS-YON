import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, CheckCircle, Crown, Target, BarChart3,
  TrendingUp, Shield, Users, AlertTriangle, Zap, Lock,
} from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { APP_DOMAIN } from '@/lib/plans';
import { type CompanyData, type RoleData, getRelatedRolesForCompany, getRelatedCompaniesForRole, calculateAcceptanceScore } from '@/lib/seoData';

interface Props {
  company: CompanyData;
  role: RoleData;
}

const difficultyColor = (score: number) => {
  if (score >= 90) return 'text-red-500';
  if (score >= 75) return 'text-orange-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-green-500';
};

export const AcceptanceRateSEOTemplate = ({ company, role }: Props) => {
  const navigate = useNavigate();

  // Demo score calculation
  const demoScore = calculateAcceptanceScore({
    keywordMatchPercent: 55,
    experienceAlignScore: 60,
    atsOptimizationPercent: 50,
    roleDifficulty: role.difficulty_index,
    companyCompetitiveness: company.hiring_competitiveness,
  });

  const metaTitle = `${role.name} Acceptance Rate at ${company.name} | Sovereign AI`;
  const metaDescription = `What are your chances of getting hired as a ${role.name} at ${company.name}? Competitiveness: ${company.hiring_competitiveness}/100. ATS Strictness: ${company.ats_strictness_score}/100. Get your personalized score.`;
  const keywords = `${company.name} ${role.name} acceptance rate, ${company.name} hiring rate, ${role.name} ${company.name} chances, ${company.name} application success rate`;

  const relatedRoles = getRelatedRolesForCompany(company.slug);
  const relatedCompanies = getRelatedCompaniesForRole(role.slug);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: `${role.name} Acceptance Rate at ${company.name}`,
        description: metaDescription,
        publisher: { '@type': 'Organization', name: 'Sovereign AI', url: APP_DOMAIN },
        datePublished: '2025-06-01',
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `What is the acceptance rate for ${role.name} at ${company.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${company.name} has a hiring competitiveness score of ${company.hiring_competitiveness}/100 for ${role.name} roles. The ATS strictness is ${company.ats_strictness_score}/100, meaning most unoptimized applications are filtered before reaching a human recruiter.`,
            },
          },
          {
            '@type': 'Question',
            name: `How can I improve my chances of getting hired as a ${role.name} at ${company.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Focus on ATS keyword optimization (matching ${role.core_keywords.slice(0, 5).join(', ')}), quantify achievements with metrics, and align your experience with ${company.name}'s ${company.culture_tone_type} culture. Sovereign's AI can calculate your exact acceptance probability.`,
            },
          },
          {
            '@type': 'Question',
            name: 'How is the acceptance rate calculated?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sovereign calculates acceptance probability using a weighted formula: Keyword Match (30%), Experience Alignment (30%), ATS Optimization (20%), Role Difficulty (10%), and Company Competitiveness (10%). No artificial manipulation for upselling.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={metaTitle}
        description={metaDescription}
        canonical={`${APP_DOMAIN}/acceptance-rate/${company.slug}/${role.slug}`}
        schema={schema}
        keywords={keywords}
      />
      <Header />

      <main>
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-red-500/5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                {company.name} · {role.name} · {company.industry}
              </Badge>

              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                {role.name} Acceptance Rate at {company.name}: What Are Your Real Chances?
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {company.name} receives {role.avg_applications_per_role.toLocaleString()}+ applications per {role.name} opening. 
                With a hiring competitiveness of {company.hiring_competitiveness}/100 and ATS strictness of {company.ats_strictness_score}/100, 
                most applicants never reach a human reviewer. Here's exactly where you stand.
              </p>

              {/* Score Demo */}
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-lg mx-auto text-left shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    {role.name} at {company.name}
                  </span>
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    Demo Score
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`text-5xl font-bold ${difficultyColor(100 - demoScore.overallScore)}`}>
                    {demoScore.overallScore}%
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{demoScore.percentile}</div>
                    <div className="text-xs text-muted-foreground">Average applicant score</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Keyword Match', value: 55 },
                    { label: 'Experience Alignment', value: 60 },
                    { label: 'ATS Optimization', value: 50 },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="text-foreground font-medium">{bar.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full" style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚡ This is the <strong>average</strong> score. Get your <strong>personalized</strong> score →
                  </p>
                </div>
              </div>

              <Button size="lg" variant="gold" className="text-base px-8 py-6" onClick={() => navigate('/auth?mode=signup')}>
                Check My {company.name} Acceptance Rate
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Free to start · No credit card required</p>
            </div>
          </div>
        </section>

        {/* Difficulty Analysis Grid */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              {company.name} × {role.name} Hiring Analysis
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Company Competitiveness', value: `${company.hiring_competitiveness}/100`, icon: TrendingUp, color: difficultyColor(company.hiring_competitiveness) },
                { label: 'ATS Strictness', value: `${company.ats_strictness_score}/100`, icon: Shield, color: difficultyColor(company.ats_strictness_score) },
                { label: 'Role Difficulty', value: `${role.difficulty_index}/100`, icon: Target, color: difficultyColor(role.difficulty_index) },
                { label: 'Avg Applicants', value: role.avg_applications_per_role.toLocaleString(), icon: Users, color: 'text-primary' },
              ].map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-medium text-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Score Formula Transparency */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              How We Calculate Your Acceptance Rate
            </h2>
            <p className="text-muted-foreground mb-6">
              Sovereign's acceptance score is a logically derived weighted formula. No artificial manipulation. No inflated numbers for upselling.
            </p>
            <div className="space-y-3">
              {[
                { factor: 'Keyword Match', weight: '30%', desc: `How well your resume matches ${role.name} keywords like ${role.core_keywords.slice(0, 3).join(', ')}.` },
                { factor: 'Experience Alignment', weight: '30%', desc: `How closely your background maps to ${company.name}'s requirements (experience weight: ${Math.round(role.experience_weight * 100)}%).` },
                { factor: 'ATS Optimization', weight: '20%', desc: `Whether your resume format passes ${company.name}'s ATS (strictness: ${company.ats_strictness_score}/100).` },
                { factor: 'Role Difficulty', weight: '10%', desc: `${role.name} difficulty index: ${role.difficulty_index}/100. Higher difficulty reduces base probability.` },
                { factor: 'Company Competitiveness', weight: '10%', desc: `${company.name} competitiveness: ${company.hiring_competitiveness}/100. More competitive = lower base probability.` },
              ].map((item) => (
                <div key={item.factor} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
                  <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded shrink-0">
                    {item.weight}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{item.factor}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Common Rejection Reasons */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Top Reasons {role.name}s Get Rejected at {company.name}
            </h2>
            <div className="space-y-3">
              {[
                `Missing critical ATS keywords: ${role.core_keywords.slice(0, 4).join(', ')}`,
                `Resume format breaks ${company.name}'s ATS parser (tables, columns, graphics)`,
                `Experience not framed in ${company.culture_tone_type} culture tone`,
                `Vague achievements without quantified metrics`,
                `Generic applications not tailored to ${company.name}'s specific requirements`,
              ].map((reason, i) => (
                <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mid CTA */}
        <section className="py-12 bg-gradient-to-r from-primary/10 to-amber-500/10 border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Get Your Personalized {company.name} Acceptance Score
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your resume. Get your real probability in 30 seconds.
            </p>
            <Button size="lg" variant="gold" onClick={() => navigate('/auth?mode=signup')}>
              Check My Score Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Internal Linking */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            {relatedRoles.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Other Roles at {company.name}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {relatedRoles.filter(r => r.slug !== role.slug).map((r) => (
                    <Link
                      key={r.slug}
                      to={`/acceptance-rate/${company.slug}/${r.slug}`}
                      className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {r.name}
                      <div className="text-xs text-muted-foreground mt-0.5">Difficulty: {r.difficulty_index}/100</div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {relatedCompanies.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {role.name} at Other Companies
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {relatedCompanies.filter(c => c.slug !== company.slug).map((c) => (
                    <Link
                      key={c.slug}
                      to={`/acceptance-rate/${c.slug}/${role.slug}`}
                      className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {c.name}
                      <div className="text-xs text-muted-foreground mt-0.5">Competitiveness: {c.hiring_competitiveness}/100</div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Cross-links */}
            <div className="flex flex-wrap gap-3">
              <Link to={`/get-hired-at/${company.slug}`} className="text-xs text-primary hover:underline">
                How to Get Hired at {company.name} →
              </Link>
              <Link to={`/resume-for/${company.slug}/${role.slug}`} className="text-xs text-primary hover:underline">
                {role.name} Resume for {company.name} →
              </Link>
              <Link to={`/ats-resume-checker/${role.slug}`} className="text-xs text-primary hover:underline">
                ATS Checker for {role.name} →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-card border-t border-border">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Stop Guessing Your Odds at {company.name}
            </h2>
            <p className="text-muted-foreground mb-6">
              Get your exact acceptance probability for {role.name} at {company.name}. Free, instant, data-driven.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate('/auth?mode=signup')}>
                Get My Free Score
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                View Plans
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
