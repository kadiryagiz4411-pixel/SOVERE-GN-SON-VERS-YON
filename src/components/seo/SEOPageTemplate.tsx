import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Crown, ArrowRight, CheckCircle, AlertTriangle, Target,
  BarChart3, Zap, Shield, Users, TrendingUp, Lock,
} from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { CompanyData, RoleData, getRelatedCompaniesForRole, getRelatedRolesForCompany } from '@/lib/seoData';
import { APP_DOMAIN } from '@/lib/plans';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface SEOPageTemplateProps {
  type: 'get-hired' | 'resume-for' | 'ats-checker' | 'how-to-get' | 'best-resume';
  company?: CompanyData;
  role?: RoleData;
}

const difficultyColor = (score: number) => {
  if (score >= 90) return 'text-red-500';
  if (score >= 75) return 'text-orange-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-green-500';
};

const difficultyLabel = (score: number) => {
  if (score >= 90) return 'Extremely Competitive';
  if (score >= 75) return 'Very Competitive';
  if (score >= 60) return 'Competitive';
  return 'Moderately Competitive';
};

export const SEOPageTemplate = ({ type, company, role }: SEOPageTemplateProps) => {
  const navigate = useNavigate();

  // ---- Dynamic content per page type ----
  const getContent = () => {
    switch (type) {
      case 'get-hired':
        return {
          title: `How to Get Hired at ${company?.name} — AI-Powered Application Strategy`,
          metaTitle: `Get Hired at ${company?.name} in 2025 | Sovereign AI`,
          metaDescription: `${company?.name} rejects ${100 - Math.round((100 - (company?.hiring_competitiveness || 80)) * 1.2)}% of applicants. Use Sovereign's AI to analyze your application, predict your acceptance score, and fix what's holding you back.`,
          headline: `Stop Guessing. Know If ${company?.name} Will Hire You.`,
          subheadline: `${company?.name} receives thousands of applications. Only candidates who understand their ATS system and culture tone make it through. Sovereign gives you the exact intelligence you need.`,
          cta: `Analyze My ${company?.name} Application`,
          keywords: `get hired at ${company?.name}, ${company?.name} job application tips, ${company?.name} hiring process, ${company?.name} interview, ${company?.name} resume`,
        };
      case 'resume-for':
        return {
          title: `${role?.name} Resume for ${company?.name} — AI Resume Optimizer`,
          metaTitle: `${role?.name} Resume for ${company?.name} | Sovereign AI`,
          metaDescription: `Beat the ${company?.name} ATS with a ${role?.name} resume optimized by AI. Get keyword analysis, acceptance probability score, and instant improvement suggestions.`,
          headline: `Build a ${role?.name} Resume That Passes ${company?.name}'s ATS`,
          subheadline: `${company?.name}'s ATS filters out ${company?.ats_strictness_score}% of resumes before a human sees them. Sovereign reverse-engineers their system to put your application in front of the right people.`,
          cta: 'Optimize My Resume Now',
          keywords: `${company?.name} ${role?.name} resume, ${role?.name} resume tips, ${company?.name} ATS optimization, ${role?.name} resume keywords`,
        };
      case 'ats-checker':
        return {
          title: `ATS Resume Checker for ${role?.name} — Pass Every ATS Filter`,
          metaTitle: `ATS Resume Checker for ${role?.name} | Sovereign AI`,
          metaDescription: `${role?.name} applications face intense ATS screening. Sovereign's AI scans your resume for the exact keywords hiring managers look for, scores your ATS compatibility, and tells you what to fix.`,
          headline: `Your ${role?.name} Resume is Probably Getting Rejected by ATS`,
          subheadline: `Over 75% of resumes are rejected before a human reads them. Sovereign's ATS checker gives you a real acceptance probability score and specific fixes for the ${role?.name} role.`,
          cta: 'Check My ATS Score Now',
          keywords: `ATS resume checker ${role?.name}, ATS optimization ${role?.name}, resume scanner, ATS keywords ${role?.name}, beat applicant tracking system`,
        };
      case 'how-to-get':
        return {
          title: `How to Get a Job at ${company?.name} — Complete 2025 Guide`,
          metaTitle: `How to Get a Job at ${company?.name} in 2025 | Sovereign AI`,
          metaDescription: `Everything you need to know about landing a job at ${company?.name}: hiring process, ATS tips, culture fit, what they look for, and how to use AI to maximize your chances.`,
          headline: `The Insider's Guide to Getting a Job at ${company?.name}`,
          subheadline: `${company?.name} has a ${company?.hiring_competitiveness}/100 hiring competitiveness score. Understanding their hiring system is the difference between an interview and silence.`,
          cta: `Start My ${company?.name} Strategy`,
          keywords: `how to get a job at ${company?.name}, ${company?.name} hiring process 2025, ${company?.name} interview process, ${company?.name} application tips`,
        };
      case 'best-resume':
        return {
          title: `Best Resume for ${role?.name} in 2025 — AI-Optimized Template`,
          metaTitle: `Best ${role?.name} Resume 2025 | Sovereign AI`,
          metaDescription: `The best ${role?.name} resume in 2025 uses AI optimization, proper keyword density, and ATS compatibility. Sovereign generates and scores your resume in seconds.`,
          headline: `The Best ${role?.name} Resume Gets More Than 1 Interview`,
          subheadline: `Most ${role?.name} resumes fail because they miss the right keywords or aren't structured for ATS systems. Sovereign fixes both problems with one AI analysis.`,
          cta: 'Generate My Best Resume',
          keywords: `best ${role?.name} resume, ${role?.name} resume template 2025, ${role?.name} resume examples, ${role?.name} resume format`,
        };
    }
  };

  const content = getContent();
  if (!content) return null;

  const competitiveness = company?.hiring_competitiveness || role?.difficulty_index || 80;
  const atsScore = company?.ats_strictness_score || 75;
  const relatedCompanies = role ? getRelatedCompaniesForRole(role.slug) : [];
  const relatedRoles = company ? getRelatedRolesForCompany(company.slug) : [];

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: content.headline,
        description: content.metaDescription,
        publisher: {
          '@type': 'Organization',
          name: 'Sovereign AI',
          url: APP_DOMAIN,
        },
        datePublished: '2025-01-01',
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: company ? `How competitive is it to get hired at ${company.name}?` : `How competitive is a ${role?.name} role?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: company
                ? `${company.name} has a hiring competitiveness score of ${company.hiring_competitiveness}/100 and an ATS strictness of ${company.ats_strictness_score}/100. This means most applications are filtered before reaching a recruiter.`
                : `The ${role?.name} role has a difficulty index of ${role?.difficulty_index}/100 with approximately ${role?.avg_applications_per_role.toLocaleString()} applications per opening on average.`,
            },
          },
          {
            '@type': 'Question',
            name: 'How does Sovereign AI help improve my application?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sovereign analyzes your resume or proposal against the job description, calculates an acceptance probability score, identifies missing keywords, and gives you specific improvement actions to dramatically increase your chances.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is an ATS score and why does it matter?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'An ATS (Applicant Tracking System) score measures how well your resume passes automated filtering systems. Most companies use ATS to filter 70-90% of applications before a human ever reads them. A low ATS score means automatic rejection.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={content.metaTitle}
        description={content.metaDescription}
        canonical={`${APP_DOMAIN}${window.location.pathname}`}
        schema={schema}
        keywords={content.keywords}
      />
      <Header />

      <main>
        {/* ===== HERO ===== */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-amber-500/5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              {company && (
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  {company.name} · {company.industry} · {company.headquarters}
                </Badge>
              )}
              {role && !company && (
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  {role.name} · {role.avg_applications_per_role.toLocaleString()} avg. applicants per opening
                </Badge>
              )}

              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                {content.headline}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {content.subheadline}
              </p>

              {/* Score Demo Mock */}
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-lg mx-auto text-left shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Acceptance Probability Score</span>
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Live Preview</Badge>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl font-bold text-primary">62%</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Top 38%</div>
                    <div className="text-xs text-muted-foreground">Before optimization</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Keyword Match', value: 58, max: 100 },
                    { label: 'ATS Compatibility', value: 71, max: 100 },
                    { label: 'Experience Alignment', value: 65, max: 100 },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="text-foreground font-medium">{bar.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚡ <strong>3 optimizations</strong> could push you to <strong>Top 12%</strong>
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                variant="gold"
                className="text-base px-8 py-6"
                onClick={() => navigate('/auth?mode=signup')}
              >
                {content.cta}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Free to start · No credit card required</p>
            </div>
          </div>
        </section>

        {/* ===== HIRING DIFFICULTY ANALYSIS ===== */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              {company ? `${company.name} Hiring Analysis` : `${role?.name} Market Analysis`}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Competitiveness',
                  value: `${competitiveness}/100`,
                  sub: difficultyLabel(competitiveness),
                  color: difficultyColor(competitiveness),
                  icon: TrendingUp,
                },
                {
                  label: 'ATS Strictness',
                  value: `${atsScore}/100`,
                  sub: atsScore > 80 ? 'Very Strict' : atsScore > 65 ? 'Strict' : 'Moderate',
                  color: difficultyColor(atsScore),
                  icon: Shield,
                },
                {
                  label: company ? 'Culture Tone' : 'Avg. Applicants',
                  value: company ? (company.culture_tone_type.charAt(0).toUpperCase() + company.culture_tone_type.slice(1)) : (role?.avg_applications_per_role.toLocaleString() || '1,200'),
                  sub: company ? 'Hiring style' : 'Per opening',
                  color: 'text-primary',
                  icon: Users,
                },
                {
                  label: company ? 'Demand Intensity' : 'Experience Weight',
                  value: company
                    ? (company.demand_intensity.charAt(0).toUpperCase() + company.demand_intensity.slice(1))
                    : `${Math.round((role?.experience_weight || 0.7) * 100)}%`,
                  sub: company ? 'Hiring volume' : 'Role importance',
                  color: 'text-foreground',
                  icon: Target,
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-medium text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ATS KEYWORD INSIGHTS ===== */}
        {role && (
          <section className="py-12">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Critical Keywords for {role.name}
              </h2>
              <p className="text-muted-foreground mb-6">
                These keywords are scanned by ATS systems hiring for this role. Missing them = automatic filtering.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Core Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {role.core_keywords.map((kw) => (
                      <span key={kw} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    Skill Clusters
                  </h3>
                  <div className="space-y-2">
                    {role.skill_clusters.map((skill) => (
                      <div key={skill} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== WHAT SOVEREIGN DOES ===== */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              What Sovereign Analyzes For You
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: BarChart3,
                  title: 'Acceptance Score',
                  desc: 'Real probability score based on keyword match, experience alignment, ATS compatibility, and role difficulty — not randomized.',
                  tier: 'Free',
                },
                {
                  icon: Zap,
                  title: 'Keyword Gap Analysis',
                  desc: 'Exact keywords missing from your application that ATS systems are filtering for. See your gap vs. top applicants.',
                  tier: 'Pro',
                },
                {
                  icon: Crown,
                  title: 'Multi-Company Strategy',
                  desc: 'Adapt your application for multiple companies simultaneously. Strategic positioning simulation and pivot suggestions.',
                  tier: 'Elite',
                },
              ].map((item) => (
                <div key={item.title} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <item.icon className="w-5 h-5 text-primary" />
                    <Badge variant="outline" className="text-[10px]">{item.tier}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== IMPROVEMENT GUIDE ===== */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Resume Improvement Guide
              {company ? ` for ${company.name}` : role ? ` for ${role.name}` : ''}
            </h2>
            <div className="space-y-4">
              {[
                {
                  step: '01',
                  title: 'Match the exact job description language',
                  desc: 'ATS systems look for exact keyword matches. Paraphrasing reduces your score. Use the same terminology the job posting uses.',
                  impact: 'High',
                },
                {
                  step: '02',
                  title: 'Quantify every achievement with metrics',
                  desc: 'Vague claims are filtered out. "Improved performance" becomes "Improved API response time by 40%, reducing server load by 25%".',
                  impact: 'High',
                },
                {
                  step: '03',
                  title: 'Remove ATS-breaking formatting',
                  desc: 'Tables, headers, columns, and images break most ATS parsers. Use a clean single-column format with standard section headers.',
                  impact: 'Critical',
                },
                {
                  step: '04',
                  title: `Mirror ${company?.name || (role?.name ? `${role.name} role`  : 'company')} culture tone`,
                  desc: company
                    ? `${company.name} has a ${company.culture_tone_type} culture. Your application tone should reflect ${company.culture_tone_type === 'technical' ? 'precision, depth, and impact metrics' : company.culture_tone_type === 'startup' ? 'speed, ownership, and scrappiness' : 'structure, reliability, and scalability'}.`
                    : `Match the culture tone of companies you are targeting. Technical companies want precision. Startups want ownership. Corporate roles want structure.`,
                  impact: 'Medium',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 bg-card border border-border rounded-xl p-5">
                  <div className="text-3xl font-black text-primary/20 shrink-0">{item.step}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.impact === 'Critical' ? 'bg-red-500/10 text-red-500' :
                        item.impact === 'High' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {item.impact}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== MID-PAGE CTA ===== */}
        <section className="py-12 bg-gradient-to-r from-primary/10 to-amber-500/10 border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">
                {competitiveness}% of applicants get rejected before a human sees their resume
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Know Your Exact Odds Before You Apply
            </h2>
            <p className="text-muted-foreground mb-6">
              Sovereign gives you a real acceptance score in under 30 seconds.
            </p>
            <Button size="lg" variant="gold" onClick={() => navigate('/auth?mode=signup')}>
              Get My Free Score
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* ===== INTERNAL LINKING ===== */}
        {(relatedCompanies.length > 0 || relatedRoles.length > 0) && (
          <section className="py-12">
            <div className="container mx-auto px-4 max-w-4xl">
              {relatedRoles.length > 0 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Roles at {company?.name}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {relatedRoles.map((r) => (
                      <Link
                        key={r.slug}
                        to={`/resume-for/${company?.slug}/${r.slug}`}
                        className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        {r.name}
                        <div className="text-xs text-muted-foreground mt-0.5">Difficulty: {r.difficulty_index}/100</div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {relatedCompanies.length > 0 && role && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Top Companies Hiring {role.name}s
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {relatedCompanies.map((c) => (
                      <Link
                        key={c.slug}
                        to={`/get-hired-at/${c.slug}`}
                        className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        {c.name}
                        <div className="text-xs text-muted-foreground mt-0.5">Competitiveness: {c.hiring_competitiveness}/100</div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 bg-card border-t border-border">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Your Acceptance Score Is Waiting
            </h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of candidates who use Sovereign to stop guessing and start getting hired.
              Free to start — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate('/auth?mode=signup')}>
                {content.cta}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                View Pricing
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Free acceptance score</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />No credit card</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />30-second analysis</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
