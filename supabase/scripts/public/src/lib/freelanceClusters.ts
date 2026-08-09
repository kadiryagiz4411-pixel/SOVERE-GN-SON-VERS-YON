// ============================================================
// FREELANCE PROFESSION CLUSTERS — Structured Template System
// ============================================================

export type PlatformType = 'upwork' | 'fiverr' | 'direct-client' | 'agency';

export interface PlatformMeta {
  id: PlatformType;
  label: string;
  description: string;
  lengthRange: [number, number]; // word count
  toneDefault: string;
}

export const PLATFORMS: PlatformMeta[] = [
  { id: 'upwork', label: 'Upwork', description: 'Cover letter style proposals', lengthRange: [250, 400], toneDefault: 'professional' },
  { id: 'fiverr', label: 'Fiverr', description: 'Gig-based buyer requests', lengthRange: [100, 200], toneDefault: 'direct' },
  { id: 'direct-client', label: 'Direct Client Pitch', description: 'Cold outreach to potential clients', lengthRange: [200, 350], toneDefault: 'persuasive' },
  { id: 'agency', label: 'Agency Outreach', description: 'Partnership proposals to agencies', lengthRange: [300, 450], toneDefault: 'professional' },
];

export type ClusterCategory = 'creative' | 'technical' | 'marketing' | 'consulting';

export interface Profession {
  id: string;
  label: string;
  cluster: ClusterCategory;
}

export interface ClusterConfig {
  id: ClusterCategory;
  label: string;
  icon: string;
  professions: Profession[];
  hookStructure: string;
  bodyFlowTemplate: string;
  ctaLogic: string;
  toneCalibration: string;
  proofStrategy: string;
  optimalLength: string;
}

export const CLUSTERS: ClusterConfig[] = [
  {
    id: 'creative',
    label: 'Creative',
    icon: '🎨',
    professions: [
      { id: 'logo-designer', label: 'Logo Designer', cluster: 'creative' },
      { id: 'graphic-designer', label: 'Graphic Designer', cluster: 'creative' },
      { id: 'beatmaker', label: 'Beatmaker', cluster: 'creative' },
      { id: 'video-editor', label: 'Video Editor', cluster: 'creative' },
      { id: 'motion-designer', label: 'Motion Designer', cluster: 'creative' },
    ],
    hookStructure: 'Open with a visual/creative insight that shows you understand their brand aesthetic or audience. Reference a specific detail from the brief.',
    bodyFlowTemplate: 'Portfolio highlight → Process description → Style alignment → Timeline commitment',
    ctaLogic: 'Offer a quick mock-up, mood board, or sample concept as a low-risk next step.',
    toneCalibration: 'Creative-professional: confident about your craft, enthusiastic but not gushy. Let your work speak.',
    proofStrategy: 'Portfolio links, before/after examples, client testimonials, engagement metrics from past creative work.',
    optimalLength: '200-350 words. Creatives are visual — keep text tight, let portfolio do the heavy lifting.',
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: '💻',
    professions: [
      { id: 'web-developer', label: 'Web Developer', cluster: 'technical' },
      { id: 'backend-engineer', label: 'Backend Engineer', cluster: 'technical' },
      { id: 'ai-developer', label: 'AI Developer', cluster: 'technical' },
      { id: 'data-analyst', label: 'Data Analyst', cluster: 'technical' },
      { id: 'blockchain-developer', label: 'Blockchain Developer', cluster: 'technical' },
    ],
    hookStructure: 'Open with a technical observation about their project/stack. Show you understand the architecture or problem domain.',
    bodyFlowTemplate: 'Technical diagnosis → Proposed approach → Stack/tools → Timeline + deliverables',
    ctaLogic: 'Offer a brief technical audit, architecture suggestion, or small proof-of-concept.',
    toneCalibration: 'Technical-authoritative: precise, jargon-appropriate, confident. Show depth without lecturing.',
    proofStrategy: 'GitHub links, live project demos, performance metrics, tech stack expertise, certifications.',
    optimalLength: '280-400 words. Technical buyers need enough detail to assess competence.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📈',
    professions: [
      { id: 'copywriter', label: 'Copywriter', cluster: 'marketing' },
      { id: 'seo-specialist', label: 'SEO Specialist', cluster: 'marketing' },
      { id: 'media-buyer', label: 'Media Buyer', cluster: 'marketing' },
      { id: 'growth-marketer', label: 'Growth Marketer', cluster: 'marketing' },
      { id: 'social-media-manager', label: 'Social Media Manager', cluster: 'marketing' },
    ],
    hookStructure: 'Open with a data-driven insight about their market, competitors, or growth opportunity. Show strategic thinking.',
    bodyFlowTemplate: 'Market observation → Strategy overview → Expected outcomes → Measurement framework',
    ctaLogic: 'Offer a free audit, competitor analysis snippet, or quick-win strategy as a conversation starter.',
    toneCalibration: 'Results-driven: numbers-focused, strategic, confident about ROI. Avoid buzzwords without backing.',
    proofStrategy: 'ROI metrics, case studies with numbers, growth percentages, campaign screenshots, client revenue impact.',
    optimalLength: '250-380 words. Marketers value clarity and results — be concise and metric-heavy.',
  },
  {
    id: 'consulting',
    label: 'Consulting',
    icon: '🏢',
    professions: [
      { id: 'product-consultant', label: 'Product Consultant', cluster: 'consulting' },
      { id: 'operations-consultant', label: 'Operations Consultant', cluster: 'consulting' },
      { id: 'sales-consultant', label: 'Sales Consultant', cluster: 'consulting' },
    ],
    hookStructure: 'Open with a business-level observation about their company or industry challenge. Position yourself as a strategic partner.',
    bodyFlowTemplate: 'Business diagnosis → Framework/methodology → Expected impact → Engagement model',
    ctaLogic: 'Offer a discovery call, brief diagnostic session, or strategic framework document.',
    toneCalibration: 'Executive-consultative: authoritative, strategic, partnership-oriented. Speak to business outcomes.',
    proofStrategy: 'Client logos, revenue/efficiency improvements, frameworks developed, executive testimonials.',
    optimalLength: '300-450 words. Consulting requires demonstrating strategic depth and business acumen.',
  },
];

export const getAllProfessions = (): Profession[] =>
  CLUSTERS.flatMap((c) => c.professions);

export const getClusterById = (id: ClusterCategory): ClusterConfig | undefined =>
  CLUSTERS.find((c) => c.id === id);

export const getProfessionById = (id: string): Profession | undefined =>
  getAllProfessions().find((p) => p.id === id);

export const getClusterForProfession = (professionId: string): ClusterConfig | undefined => {
  const profession = getProfessionById(professionId);
  if (!profession) return undefined;
  return getClusterById(profession.cluster);
};

export const getPlatformById = (id: PlatformType): PlatformMeta | undefined =>
  PLATFORMS.find((p) => p.id === id);

// ---- Freelance Scoring ----

export interface FreelanceScoreFactors {
  hookStrength: number;        // 0-100
  clientPainAlignment: number; // 0-100
  skillRelevance: number;      // 0-100
  proofDensity: number;        // 0-100
  ctaClarity: number;          // 0-100
  lengthOptimization: number;  // 0-100
  platformCompetitiveness: number; // 1-100
  clusterCalibration: number;  // 0-100
}

export interface FreelanceScoreBreakdown {
  overallScore: number;
  factors: FreelanceScoreFactors;
  percentile: string;
  interpretation: string;
  topSuggestions: string[];
}

export const calculateFreelanceScore = (
  factors: FreelanceScoreFactors
): FreelanceScoreBreakdown => {
  const {
    hookStrength,
    clientPainAlignment,
    skillRelevance,
    proofDensity,
    ctaClarity,
    lengthOptimization,
    platformCompetitiveness,
    clusterCalibration,
  } = factors;

  // Weighted formula
  const rawScore =
    hookStrength * 0.18 +
    clientPainAlignment * 0.20 +
    skillRelevance * 0.18 +
    proofDensity * 0.12 +
    ctaClarity * 0.10 +
    lengthOptimization * 0.07 +
    (100 - platformCompetitiveness) * 0.08 +
    clusterCalibration * 0.07;

  const overallScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let percentile = '';
  let interpretation = '';
  if (overallScore >= 85) {
    percentile = 'Top 5%';
    interpretation = 'Outstanding proposal. High probability of client engagement.';
  } else if (overallScore >= 70) {
    percentile = 'Top 20%';
    interpretation = 'Strong proposal. Small tweaks could push you to the top.';
  } else if (overallScore >= 55) {
    percentile = 'Top 40%';
    interpretation = 'Decent proposal but needs more specificity and proof.';
  } else if (overallScore >= 40) {
    percentile = 'Top 60%';
    interpretation = 'Below average. Significant improvements needed.';
  } else {
    percentile = 'Bottom 40%';
    interpretation = 'High rejection risk. Fundamental restructuring needed.';
  }

  const suggestions: string[] = [];
  if (hookStrength < 60) suggestions.push('Strengthen your opening hook — reference a specific detail from the client\'s brief');
  if (clientPainAlignment < 60) suggestions.push('Better align your proposal with the client\'s core pain points');
  if (skillRelevance < 60) suggestions.push('Highlight skills that directly match the project requirements');
  if (proofDensity < 50) suggestions.push('Add concrete proof: portfolio links, metrics, or testimonials');
  if (ctaClarity < 60) suggestions.push('End with a clear, specific call-to-action (e.g., "I can deliver a first draft by Friday")');
  if (lengthOptimization < 50) suggestions.push('Adjust proposal length — too short lacks substance, too long loses attention');

  return {
    overallScore,
    factors,
    percentile,
    interpretation,
    topSuggestions: suggestions.slice(0, 3),
  };
};

// ---- SEO Data for Freelance Pages ----

export interface FreelanceSEOData {
  slug: string;
  profession: string;
  platform: string;
  title: string;
  description: string;
}

export const generateFreelanceSEOPages = (): FreelanceSEOData[] => {
  const pages: FreelanceSEOData[] = [];
  const platforms = ['upwork', 'fiverr'];
  
  for (const profession of getAllProfessions()) {
    // Per-platform pages
    for (const platform of platforms) {
      pages.push({
        slug: `${platform}-proposal-${profession.id}`,
        profession: profession.label,
        platform,
        title: `Best ${platform.charAt(0).toUpperCase() + platform.slice(1)} Proposal for ${profession.label}`,
        description: `Generate a winning ${platform} proposal for ${profession.label} jobs. AI-powered, template-driven, optimized for acceptance.`,
      });
    }
    // Generic pages
    pages.push({
      slug: `best-proposal-${profession.id}`,
      profession: profession.label,
      platform: 'generic',
      title: `Best Proposal for ${profession.label} — AI Proposal Generator`,
      description: `Create the perfect freelance proposal for ${profession.label} projects. Structured, optimized, and ready to send.`,
    });
  }
  
  return pages;
};
