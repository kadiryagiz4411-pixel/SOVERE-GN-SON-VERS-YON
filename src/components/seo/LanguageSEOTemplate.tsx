import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Globe, CheckCircle, Crown, Zap, Target, FileText, BarChart3, Users, Shield, AlertTriangle } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { APP_DOMAIN } from '@/lib/plans';
import { type Profession, getClusterForProfession, getAllProfessions } from '@/lib/freelanceClusters';
import { type RoleData, TOP_ROLES, getRelatedCompaniesForRole } from '@/lib/seoData';
import { type SEOLanguage, getNonEnglishLanguages } from '@/lib/seoLanguages';

interface LanguageSEOTemplateProps {
  type: 'proposal' | 'resume' | 'template';
  profession?: Profession;
  role?: RoleData;
  language: SEOLanguage;
}

export const LanguageSEOTemplate = ({ type, profession, role, language }: LanguageSEOTemplateProps) => {
  const navigate = useNavigate();
  const cluster = profession ? getClusterForProfession(profession.id) : undefined;

  const getContent = () => {
    if (type === 'proposal' && profession) {
      return {
        metaTitle: `${profession.label} Proposal in ${language.name} | Sovereign AI`,
        metaDescription: `Generate a winning freelance proposal for ${profession.label} in ${language.name}. AI-powered localization with cultural tone adaptation. Not raw translation.`,
        headline: `Write a Winning ${profession.label} Proposal in ${language.name}`,
        subheadline: `Sovereign doesn't translate proposals — it rewrites them with native ${language.name} communication patterns, cultural tone calibration, and ${cluster?.label || 'professional'} cluster optimization.`,
        cta: `Generate ${language.name} Proposal`,
        keywords: `${profession.label} proposal ${language.name}, freelance proposal in ${language.nativeName}, ${language.name} freelance proposal template`,
      };
    }
    if (type === 'resume' && role) {
      return {
        metaTitle: `${role.name} Resume in ${language.name} | Sovereign AI`,
        metaDescription: `Create an ATS-optimized ${role.name} resume in ${language.name}. AI-powered with keyword analysis and cultural adaptation for ${language.region} markets.`,
        headline: `Build a ${role.name} Resume in ${language.name} That Gets Interviews`,
        subheadline: `${language.region} hiring markets have unique expectations. Sovereign adapts your ${role.name} resume to ${language.name}-speaking ATS systems and recruiter expectations.`,
        cta: `Generate ${language.name} Resume`,
        keywords: `${role.name} resume ${language.name}, ${language.nativeName} resume template, ${role.name} CV in ${language.name}`,
      };
    }
    // template type
    return {
      metaTitle: `${profession?.label} Proposal Template in ${language.name} | Sovereign`,
      metaDescription: `Ready-to-use ${profession?.label} proposal template in ${language.name}. Structured, AI-optimized, and culturally adapted for ${language.region} clients.`,
      headline: `${profession?.label} Proposal Template in ${language.name}`,
      subheadline: `Get a structured, conversion-optimized proposal template for ${profession?.label} projects, perfectly adapted for ${language.name}-speaking clients in ${language.region}.`,
      cta: `Get My ${language.name} Template`,
      keywords: `${profession?.label} proposal template ${language.name}, ${language.nativeName} proposal, freelance template ${language.name}`,
    };
  };

  const content = getContent();

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: content.headline,
        description: content.metaDescription,
        inLanguage: language.slug,
        publisher: { '@type': 'Organization', name: 'Sovereign AI', url: APP_DOMAIN },
        datePublished: '2025-06-01',
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Can I generate a ${type === 'resume' ? 'resume' : 'proposal'} in ${language.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes. Sovereign generates ${type === 'resume' ? 'resumes' : 'proposals'} in ${language.name} using context-preserving rewriting — not raw translation. The output adapts to ${language.region} communication norms and hiring culture.`,
            },
          },
          {
            '@type': 'Question',
            name: `Is the ${language.name} output just a translation?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `No. Sovereign uses cultural tone calibration to adapt the structure, formality, and persuasion style to match ${language.name}-speaking markets. This includes adjusting formality levels, proof presentation, and call-to-action phrasing.`,
            },
          },
          {
            '@type': 'Question',
            name: 'How many languages does Sovereign support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sovereign supports up to 50 languages. Free users can generate in English. Pro users unlock 5 languages. Elite users get all 50 languages with cultural tone adjustment.',
            },
          },
        ],
      },
    ],
  };

  // Related languages
  const otherLanguages = getNonEnglishLanguages()
    .filter((l) => l.slug !== language.slug)
    .slice(0, 6);

  // Related professions or roles
  const relatedProfessions = profession && cluster
    ? cluster.professions.filter((p) => p.id !== profession.id).slice(0, 4)
    : [];
  const relatedRoles = role
    ? TOP_ROLES.filter((r) => r.slug !== role.slug).slice(0, 4)
    : [];

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
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-background to-primary/5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-blue-500/10 text-blue-600 border-blue-500/20">
                <Globe className="w-3 h-3 mr-1" />
                {language.nativeName} · {language.region}
              </Badge>

              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                {content.headline}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {content.subheadline}
              </p>

              {/* Localization Demo */}
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-lg mx-auto text-left shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    {type === 'resume' ? 'Resume' : 'Proposal'} Localization Engine
                  </span>
                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                    {language.name}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Cultural Tone Adaptation', value: 94 },
                    { label: 'Keyword Preservation', value: 88 },
                    { label: 'Formality Calibration', value: 91 },
                    { label: 'Persuasion Structure', value: 85 },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="text-foreground font-medium">{bar.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full" style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    🌍 Context-preserving rewriting — <strong>not raw translation</strong>
                  </p>
                </div>
              </div>

              <Button size="lg" variant="gold" className="text-base px-8 py-6" onClick={() => navigate('/auth?mode=signup')}>
                {content.cta}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Free to start · English free · Pro unlocks 5 languages</p>
            </div>
          </div>
        </section>

        {/* Why Not Raw Translation */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Why Translation Kills Your {type === 'resume' ? 'Resume' : 'Proposal'}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-red-500/20 rounded-xl p-5">
                <h3 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Raw Translation Problems
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    Loses persuasion structure and tone
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    Breaks keyword optimization for local ATS
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    Ignores cultural communication norms
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✗</span>
                    Sounds robotic and unnatural
                  </li>
                </ul>
              </div>
              <div className="bg-card border border-green-500/20 rounded-xl p-5">
                <h3 className="font-semibold text-green-500 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Sovereign's Approach
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Rewrites with native {language.name} persuasion patterns
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Preserves keyword density for {language.region} markets
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Adapts formality to {language.name} business culture
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Sounds like a native {language.name} professional wrote it
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              What You Get with {language.name} Generation
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Globe, title: 'Native Output', desc: `Output reads like it was written by a native ${language.name} speaker, not translated by a machine.`, tier: 'Pro' },
                { icon: Target, title: 'Cultural Calibration', desc: `Adapts tone, formality, and persuasion style for ${language.region} hiring and business culture.`, tier: 'Pro' },
                { icon: Crown, title: 'Tone Adjustment', desc: 'Choose between Formal, Persuasive, Direct, High-context, and Low-context communication styles.', tier: 'Elite' },
              ].map((item) => (
                <div key={item.title} className="bg-card border border-border rounded-xl p-5 text-center">
                  <item.icon className="w-6 h-6 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-foreground mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                  <Badge variant="outline" className="text-[10px]">{item.tier}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Optimization Guide */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {language.name} {type === 'resume' ? 'Resume' : 'Proposal'} Optimization Guide
            </h2>
            <div className="space-y-4">
              {[
                {
                  step: '01',
                  title: `Understand ${language.region} hiring expectations`,
                  desc: `Each market has unique expectations. ${language.name}-speaking recruiters and clients look for specific signals of professionalism, competence, and cultural fit that differ from English-speaking markets.`,
                  impact: 'Critical',
                },
                {
                  step: '02',
                  title: 'Adapt formality, not just words',
                  desc: `Some cultures expect high formality (e.g., German, Japanese business communication). Others prefer directness. Sovereign calibrates the right formality level for ${language.name}.`,
                  impact: 'High',
                },
                {
                  step: '03',
                  title: 'Preserve keywords across languages',
                  desc: `Technical keywords and industry terms often stay in English even in ${language.name} documents. Sovereign intelligently preserves the right terms while localizing the rest.`,
                  impact: 'High',
                },
                {
                  step: '04',
                  title: 'Match local proof expectations',
                  desc: `What counts as "proof" varies by culture. Some markets value certifications, others value portfolio depth, others value client logos. Sovereign adapts proof presentation for ${language.region}.`,
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

        {/* Mid-page CTA */}
        <section className="py-12 bg-gradient-to-r from-blue-500/10 to-primary/10 border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Generate Your {language.name} {type === 'resume' ? 'Resume' : 'Proposal'} Now
            </h2>
            <p className="text-muted-foreground mb-6">
              AI-powered, culturally adapted, ready in seconds.
            </p>
            <Button size="lg" variant="gold" onClick={() => navigate('/auth?mode=signup')}>
              Start Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Internal Linking: Other Languages */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {profession ? `${profession.label}` : role ? `${role.name}` : ''} in Other Languages
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {otherLanguages.map((l) => {
                const href = type === 'resume' && role
                  ? `/resume/${role.slug}/${l.slug}`
                  : profession
                    ? `/proposal/${profession.id}/${l.slug}`
                    : '#';
                return (
                  <Link
                    key={l.slug}
                    to={href}
                    className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <Globe className="w-3 h-3 inline mr-1 text-muted-foreground" />
                    {l.name}
                    <div className="text-xs text-muted-foreground mt-0.5">{l.nativeName}</div>
                  </Link>
                );
              })}
            </div>

            {/* Back to English version */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Base Version</h3>
              {profession && (
                <Link to={`/best-proposal/${profession.id}`} className="text-sm text-primary hover:underline">
                  ← {profession.label} Proposal (English) 
                </Link>
              )}
              {role && (
                <Link to={`/best-resume-for/${role.slug}`} className="text-sm text-primary hover:underline">
                  ← {role.name} Resume (English)
                </Link>
              )}
            </div>

            {/* Related professions/roles */}
            {relatedProfessions.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-foreground mb-3">Related Professions in {language.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {relatedProfessions.map((p) => (
                    <Link
                      key={p.id}
                      to={`/proposal/${p.id}/${language.slug}`}
                      className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {p.label}
                      <div className="text-xs text-muted-foreground mt-0.5">{language.name} →</div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {relatedRoles.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-foreground mb-3 mt-6">Related Roles in {language.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {relatedRoles.map((r) => (
                    <Link
                      key={r.slug}
                      to={`/resume/${r.slug}/${language.slug}`}
                      className="bg-card border border-border rounded-lg p-3 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {r.name}
                      <div className="text-xs text-muted-foreground mt-0.5">{language.name} →</div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-card border-t border-border">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Go Global with Sovereign
            </h2>
            <p className="text-muted-foreground mb-6">
              Generate winning {type === 'resume' ? 'resumes' : 'proposals'} in {language.name} and 49 other languages.
              Free to start — upgrade for multi-language access.
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
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />English free</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Pro: 5 languages</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />Elite: 50 languages</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
