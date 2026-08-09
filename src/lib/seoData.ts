// ============================================================
// SEO DATA — Company & Role Models for Programmatic SEO
// ============================================================

export interface CompanyData {
  slug: string;
  name: string;
  industry: string;
  hiring_competitiveness: number; // 1-100
  ats_strictness_score: number;   // 1-100
  culture_tone_type: 'technical' | 'startup' | 'corporate' | 'creative' | 'hybrid';
  demand_intensity: 'low' | 'medium' | 'high' | 'extreme';
  headquarters: string;
  description: string;
  typical_roles: string[];
}

export interface RoleData {
  slug: string;
  name: string;
  core_keywords: string[];
  skill_clusters: string[];
  experience_weight: number; // 0-1, how much experience matters
  difficulty_index: number;  // 1-100
  avg_applications_per_role: number;
  related_companies: string[];
}

export const TOP_COMPANIES: CompanyData[] = [
  // Tech Giants
  { slug: 'google', name: 'Google', industry: 'Technology', hiring_competitiveness: 98, ats_strictness_score: 92, culture_tone_type: 'technical', demand_intensity: 'extreme', headquarters: 'Mountain View, CA', description: 'World\'s leading search engine and cloud computing company', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'ux-designer'] },
  { slug: 'meta', name: 'Meta', industry: 'Technology', hiring_competitiveness: 96, ats_strictness_score: 90, culture_tone_type: 'technical', demand_intensity: 'extreme', headquarters: 'Menlo Park, CA', description: 'Social media and metaverse technology leader', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'machine-learning-engineer'] },
  { slug: 'amazon', name: 'Amazon', industry: 'Technology/E-commerce', hiring_competitiveness: 94, ats_strictness_score: 88, culture_tone_type: 'corporate', demand_intensity: 'extreme', headquarters: 'Seattle, WA', description: 'E-commerce and cloud computing giant', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'solutions-architect'] },
  { slug: 'apple', name: 'Apple', industry: 'Technology', hiring_competitiveness: 97, ats_strictness_score: 94, culture_tone_type: 'creative', demand_intensity: 'extreme', headquarters: 'Cupertino, CA', description: 'Consumer electronics and software innovator', typical_roles: ['software-engineer', 'hardware-engineer', 'ux-designer', 'product-manager'] },
  { slug: 'microsoft', name: 'Microsoft', industry: 'Technology', hiring_competitiveness: 93, ats_strictness_score: 85, culture_tone_type: 'corporate', demand_intensity: 'high', headquarters: 'Redmond, WA', description: 'Enterprise software and cloud computing leader', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'solutions-architect'] },
  { slug: 'netflix', name: 'Netflix', industry: 'Entertainment/Technology', hiring_competitiveness: 95, ats_strictness_score: 87, culture_tone_type: 'hybrid', demand_intensity: 'extreme', headquarters: 'Los Gatos, CA', description: 'Streaming entertainment platform and content creator', typical_roles: ['software-engineer', 'data-scientist', 'product-manager', 'content-strategist'] },
  { slug: 'stripe', name: 'Stripe', industry: 'Fintech', hiring_competitiveness: 95, ats_strictness_score: 89, culture_tone_type: 'technical', demand_intensity: 'extreme', headquarters: 'San Francisco, CA', description: 'Global online payments infrastructure company', typical_roles: ['software-engineer', 'product-manager', 'solutions-architect', 'data-scientist'] },
  { slug: 'airbnb', name: 'Airbnb', industry: 'Travel/Technology', hiring_competitiveness: 92, ats_strictness_score: 83, culture_tone_type: 'creative', demand_intensity: 'high', headquarters: 'San Francisco, CA', description: 'Global vacation rental marketplace', typical_roles: ['software-engineer', 'product-manager', 'ux-designer', 'data-scientist'] },
  { slug: 'uber', name: 'Uber', industry: 'Transportation/Technology', hiring_competitiveness: 90, ats_strictness_score: 82, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'San Francisco, CA', description: 'Ride-hailing and food delivery platform', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'operations-manager'] },
  { slug: 'spotify', name: 'Spotify', industry: 'Entertainment/Technology', hiring_competitiveness: 91, ats_strictness_score: 80, culture_tone_type: 'creative', demand_intensity: 'high', headquarters: 'Stockholm, Sweden', description: 'Music streaming and podcast platform', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'ux-designer'] },
  { slug: 'notion', name: 'Notion', industry: 'SaaS/Productivity', hiring_competitiveness: 92, ats_strictness_score: 78, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'San Francisco, CA', description: 'All-in-one workspace and productivity tool', typical_roles: ['software-engineer', 'product-manager', 'ux-designer', 'content-strategist'] },
  { slug: 'figma', name: 'Figma', industry: 'Design/SaaS', hiring_competitiveness: 93, ats_strictness_score: 81, culture_tone_type: 'creative', demand_intensity: 'high', headquarters: 'San Francisco, CA', description: 'Collaborative design platform', typical_roles: ['software-engineer', 'ux-designer', 'product-manager', 'developer-advocate'] },
  { slug: 'vercel', name: 'Vercel', industry: 'Developer Tools', hiring_competitiveness: 91, ats_strictness_score: 77, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'San Francisco, CA', description: 'Frontend cloud platform and deployment infrastructure', typical_roles: ['software-engineer', 'developer-advocate', 'solutions-architect', 'product-manager'] },
  { slug: 'shopify', name: 'Shopify', industry: 'E-commerce/SaaS', hiring_competitiveness: 88, ats_strictness_score: 79, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'Ottawa, Canada', description: 'E-commerce platform for businesses of all sizes', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'ux-designer'] },
  { slug: 'salesforce', name: 'Salesforce', industry: 'CRM/SaaS', hiring_competitiveness: 85, ats_strictness_score: 83, culture_tone_type: 'corporate', demand_intensity: 'high', headquarters: 'San Francisco, CA', description: 'Leading CRM and enterprise software platform', typical_roles: ['software-engineer', 'solutions-architect', 'product-manager', 'data-scientist'] },
  { slug: 'hubspot', name: 'HubSpot', industry: 'Marketing/SaaS', hiring_competitiveness: 84, ats_strictness_score: 75, culture_tone_type: 'startup', demand_intensity: 'medium', headquarters: 'Cambridge, MA', description: 'Inbound marketing and sales software platform', typical_roles: ['software-engineer', 'product-manager', 'content-strategist', 'data-scientist'] },
  { slug: 'linear', name: 'Linear', industry: 'Developer Tools', hiring_competitiveness: 94, ats_strictness_score: 82, culture_tone_type: 'startup', demand_intensity: 'extreme', headquarters: 'San Francisco, CA', description: 'Issue tracking and project management tool for software teams', typical_roles: ['software-engineer', 'product-manager', 'ux-designer'] },
  { slug: 'openai', name: 'OpenAI', industry: 'AI/Research', hiring_competitiveness: 99, ats_strictness_score: 95, culture_tone_type: 'technical', demand_intensity: 'extreme', headquarters: 'San Francisco, CA', description: 'Artificial intelligence research and deployment company', typical_roles: ['machine-learning-engineer', 'software-engineer', 'researcher', 'product-manager'] },
  { slug: 'anthropic', name: 'Anthropic', industry: 'AI/Research', hiring_competitiveness: 98, ats_strictness_score: 94, culture_tone_type: 'technical', demand_intensity: 'extreme', headquarters: 'San Francisco, CA', description: 'AI safety and research company behind Claude', typical_roles: ['machine-learning-engineer', 'researcher', 'software-engineer', 'product-manager'] },
  { slug: 'datadog', name: 'Datadog', industry: 'DevOps/SaaS', hiring_competitiveness: 87, ats_strictness_score: 80, culture_tone_type: 'technical', demand_intensity: 'high', headquarters: 'New York, NY', description: 'Cloud monitoring and security platform', typical_roles: ['software-engineer', 'solutions-architect', 'data-scientist', 'product-manager'] },
  // Regional Leaders
  { slug: 'trendyol', name: 'Trendyol', industry: 'E-commerce', hiring_competitiveness: 85, ats_strictness_score: 76, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'Istanbul, Turkey', description: 'Leading e-commerce platform in Turkey', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'ux-designer'] },
  { slug: 'insider', name: 'Insider', industry: 'Marketing Tech', hiring_competitiveness: 82, ats_strictness_score: 72, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'Istanbul, Turkey', description: 'AI-powered marketing platform', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'content-strategist'] },
  { slug: 'getir', name: 'Getir', industry: 'Delivery/Technology', hiring_competitiveness: 83, ats_strictness_score: 74, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'Istanbul, Turkey', description: 'Ultra-fast grocery delivery platform', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'operations-manager'] },
  { slug: 'wise', name: 'Wise', industry: 'Fintech', hiring_competitiveness: 88, ats_strictness_score: 79, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'London, UK', description: 'International money transfer platform', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'solutions-architect'] },
  { slug: 'revolut', name: 'Revolut', industry: 'Fintech', hiring_competitiveness: 89, ats_strictness_score: 81, culture_tone_type: 'startup', demand_intensity: 'high', headquarters: 'London, UK', description: 'Digital banking and financial super-app', typical_roles: ['software-engineer', 'product-manager', 'data-scientist', 'machine-learning-engineer'] },
];

export const TOP_ROLES: RoleData[] = [
  {
    slug: 'software-engineer',
    name: 'Software Engineer',
    core_keywords: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'system design', 'algorithms', 'data structures', 'REST API', 'CI/CD'],
    skill_clusters: ['Frontend Development', 'Backend Development', 'Cloud Infrastructure', 'Database Management', 'Testing & QA'],
    experience_weight: 0.7,
    difficulty_index: 82,
    avg_applications_per_role: 1400,
    related_companies: ['google', 'meta', 'amazon', 'microsoft', 'stripe'],
  },
  {
    slug: 'product-manager',
    name: 'Product Manager',
    core_keywords: ['roadmap', 'OKRs', 'user research', 'A/B testing', 'PRD', 'stakeholder management', 'Agile', 'go-to-market', 'metrics', 'SQL'],
    skill_clusters: ['Product Strategy', 'Data Analysis', 'Cross-functional Leadership', 'Customer Discovery', 'Technical Communication'],
    experience_weight: 0.8,
    difficulty_index: 88,
    avg_applications_per_role: 1800,
    related_companies: ['google', 'meta', 'airbnb', 'notion', 'figma'],
  },
  {
    slug: 'data-scientist',
    name: 'Data Scientist',
    core_keywords: ['Python', 'machine learning', 'SQL', 'statistical modeling', 'pandas', 'scikit-learn', 'A/B testing', 'visualization', 'deep learning', 'NLP'],
    skill_clusters: ['Machine Learning', 'Statistical Analysis', 'Data Engineering', 'Business Intelligence', 'Experimentation'],
    experience_weight: 0.75,
    difficulty_index: 85,
    avg_applications_per_role: 1200,
    related_companies: ['google', 'netflix', 'spotify', 'amazon', 'meta'],
  },
  {
    slug: 'ux-designer',
    name: 'UX Designer',
    core_keywords: ['Figma', 'user research', 'prototyping', 'design systems', 'usability testing', 'wireframing', 'accessibility', 'interaction design', 'Sketch', 'information architecture'],
    skill_clusters: ['Visual Design', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'],
    experience_weight: 0.65,
    difficulty_index: 78,
    avg_applications_per_role: 900,
    related_companies: ['airbnb', 'figma', 'apple', 'notion', 'shopify'],
  },
  {
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    core_keywords: ['PyTorch', 'TensorFlow', 'MLOps', 'model deployment', 'feature engineering', 'distributed training', 'CUDA', 'transformer models', 'production ML', 'experiment tracking'],
    skill_clusters: ['Deep Learning', 'MLOps', 'Model Optimization', 'Data Pipelines', 'Research Implementation'],
    experience_weight: 0.85,
    difficulty_index: 93,
    avg_applications_per_role: 800,
    related_companies: ['openai', 'anthropic', 'google', 'meta', 'amazon'],
  },
  {
    slug: 'solutions-architect',
    name: 'Solutions Architect',
    core_keywords: ['AWS', 'Azure', 'GCP', 'microservices', 'enterprise architecture', 'API design', 'security', 'Kubernetes', 'cloud migration', 'technical leadership'],
    skill_clusters: ['Cloud Architecture', 'Enterprise Integration', 'Security Design', 'Technical Leadership', 'Cost Optimization'],
    experience_weight: 0.9,
    difficulty_index: 87,
    avg_applications_per_role: 600,
    related_companies: ['amazon', 'microsoft', 'salesforce', 'datadog', 'vercel'],
  },
  {
    slug: 'content-strategist',
    name: 'Content Strategist',
    core_keywords: ['SEO', 'content marketing', 'editorial planning', 'brand voice', 'analytics', 'storytelling', 'social media', 'copywriting', 'audience research', 'content operations'],
    skill_clusters: ['SEO Optimization', 'Content Creation', 'Brand Strategy', 'Analytics', 'Distribution'],
    experience_weight: 0.6,
    difficulty_index: 72,
    avg_applications_per_role: 700,
    related_companies: ['hubspot', 'notion', 'spotify', 'airbnb', 'shopify'],
  },
  {
    slug: 'developer-advocate',
    name: 'Developer Advocate',
    core_keywords: ['technical writing', 'public speaking', 'community building', 'SDK', 'API documentation', 'open source', 'blog writing', 'demos', 'developer experience', 'feedback loops'],
    skill_clusters: ['Technical Communication', 'Community Management', 'Content Creation', 'Product Feedback', 'Developer Education'],
    experience_weight: 0.7,
    difficulty_index: 80,
    avg_applications_per_role: 400,
    related_companies: ['vercel', 'figma', 'stripe', 'datadog', 'shopify'],
  },
  {
    slug: 'operations-manager',
    name: 'Operations Manager',
    core_keywords: ['process optimization', 'KPIs', 'cross-functional collaboration', 'project management', 'vendor management', 'budget planning', 'Lean', 'Six Sigma', 'ERP', 'supply chain'],
    skill_clusters: ['Process Design', 'Team Leadership', 'Data Analysis', 'Vendor Relations', 'Strategic Planning'],
    experience_weight: 0.8,
    difficulty_index: 75,
    avg_applications_per_role: 800,
    related_companies: ['amazon', 'uber', 'getir', 'shopify', 'trendyol'],
  },
  {
    slug: 'researcher',
    name: 'Researcher',
    core_keywords: ['literature review', 'experimental design', 'statistical analysis', 'paper writing', 'peer review', 'Python', 'R', 'hypothesis testing', 'data collection', 'publication'],
    skill_clusters: ['Scientific Research', 'Quantitative Analysis', 'Technical Writing', 'Experimentation', 'Collaboration'],
    experience_weight: 0.85,
    difficulty_index: 90,
    avg_applications_per_role: 300,
    related_companies: ['openai', 'anthropic', 'google', 'meta', 'microsoft'],
  },
];

// ---- Score Calculation Engine ----

export interface ScoreFactors {
  keywordMatchPercent: number;   // 0–100
  experienceAlignScore: number;  // 0–100
  atsOptimizationPercent: number; // 0–100
  roleDifficulty: number;        // 1–100 (higher = harder)
  companyCompetitiveness: number; // 1–100 (higher = more competitive)
}

export interface AcceptanceScoreBreakdown {
  overallScore: number;
  percentile: string;
  factors: ScoreFactors;
  interpretation: string;
  topHints: string[];
}

export const calculateAcceptanceScore = (
  factors: ScoreFactors
): AcceptanceScoreBreakdown => {
  const {
    keywordMatchPercent,
    experienceAlignScore,
    atsOptimizationPercent,
    roleDifficulty,
    companyCompetitiveness,
  } = factors;

  // Layer 1: Raw optimization score
  const rawScore =
    keywordMatchPercent * 0.30 +
    experienceAlignScore * 0.30 +
    atsOptimizationPercent * 0.20 +
    (100 - roleDifficulty) * 0.10 +
    (100 - companyCompetitiveness) * 0.10;

  const clampedRaw = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Layer 2: Competitive normalization
  const competitionPressure =
    (roleDifficulty / 100) * 0.30 +
    (companyCompetitiveness / 100) * 0.30 +
    Math.min(1, (roleDifficulty / 100) * 0.8 + 0.1) * 0.20 +
    Math.min(1, (companyCompetitiveness / 100) * 0.75 + 0.1) * 0.20;

  const adjustmentMultiplier = Math.max(0.55, Math.min(1.0, 1 - (competitionPressure * 0.45)));
  const adjustedScore = clampedRaw * adjustmentMultiplier;

  // Distribution calibration: center ~63, compression 0.72
  const center = 63;
  const calibrated = center + ((adjustedScore - center) * 0.72);
  const overallScore = Math.max(28, Math.min(92, Math.round(calibrated)));

  let percentile = '';
  let interpretation = '';
  if (overallScore >= 80) {
    percentile = 'Top 10%';
    interpretation = 'Strong optimization, but competition remains a factor.';
  } else if (overallScore >= 70) {
    percentile = 'Top 20%';
    interpretation = 'Solid application with room for targeted improvement.';
  } else if (overallScore >= 60) {
    percentile = 'Top 40%';
    interpretation = 'Competitive application. Focus on keyword alignment and ATS optimization.';
  } else if (overallScore >= 50) {
    percentile = 'Top 60%';
    interpretation = 'Below average. Significant improvements needed in experience framing.';
  } else if (overallScore >= 40) {
    percentile = 'Top 75%';
    interpretation = 'High rejection risk. Address critical gaps in keywords and formatting.';
  } else {
    percentile = 'Bottom 30%';
    interpretation = 'Fundamental optimization needed to compete effectively.';
  }

  const hints: string[] = [];
  if (keywordMatchPercent < 60) hints.push('Increase keyword density — match job description terminology exactly');
  if (experienceAlignScore < 60) hints.push('Reframe your experience using role-specific outcomes and metrics');
  if (atsOptimizationPercent < 70) hints.push('Improve ATS compatibility — avoid tables, graphics, and non-standard headers');
  if (roleDifficulty > 80) hints.push('This is a high-competition role — differentiate with unique project examples');
  if (companyCompetitiveness > 85) hints.push('Use company-specific language and reference their recent products or initiatives');

  return {
    overallScore,
    percentile,
    factors,
    interpretation,
    topHints: hints.slice(0, 3),
  };
};

export const getCompanyBySlug = (slug: string): CompanyData | undefined =>
  TOP_COMPANIES.find((c) => c.slug === slug);

export const getRoleBySlug = (slug: string): RoleData | undefined =>
  TOP_ROLES.find((r) => r.slug === slug);

export const getRelatedCompaniesForRole = (roleSlug: string): CompanyData[] => {
  const role = getRoleBySlug(roleSlug);
  if (!role) return TOP_COMPANIES.slice(0, 5);
  return role.related_companies
    .map(getCompanyBySlug)
    .filter(Boolean) as CompanyData[];
};

export const getRelatedRolesForCompany = (companySlug: string): RoleData[] => {
  const company = getCompanyBySlug(companySlug);
  if (!company) return TOP_ROLES.slice(0, 4);
  return company.typical_roles
    .map(getRoleBySlug)
    .filter(Boolean) as RoleData[];
};

export const slugify = (text: string) =>
  text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const deslugify = (slug: string) =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
