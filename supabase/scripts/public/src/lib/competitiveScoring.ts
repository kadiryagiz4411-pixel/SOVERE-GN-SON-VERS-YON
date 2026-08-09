// ============================================================
// COMPETITIVE SCORING ENGINE — Two-Layer Architecture
// ============================================================
// Layer 1: Raw Optimization Score (internal)
// Layer 2: Competitive Acceptance Probability (user-visible)
// ============================================================

// ---- COMPETITION MODIFIERS ----

interface CorporateModifiers {
  roleDifficulty: number;        // 1-100
  companyCompetitiveness: number; // 1-100
  marketSaturation: number;      // 0-1 (0 = no saturation, 1 = fully saturated)
  industryHiringTightness: number; // 0-1 (0 = easy hiring, 1 = very tight)
}

interface FreelanceModifiers {
  platformCompetitionDensity: number;  // 1-100
  averageProposalVolume: number;       // 1-100 (high = more competition)
  professionSaturation: number;        // 0-1
  clusterCompetitionMultiplier: number; // 0-1
}

// ---- SCORE RESULT TYPES ----

export type CompetitionLevel = 'High Competitive Pressure' | 'Moderate Competition' | 'Low Competition';

export interface CompetitiveScoreResult {
  // Layer 1 (internal — not directly shown to users)
  rawScore: number;
  // Layer 2 (user-visible)
  competitiveScore: number;
  // Metadata
  percentile: string;
  interpretation: string;
  competitionLevel: CompetitionLevel;
  contextLabel: string;
  // Improvement simulation (Elite)
  optimizedPotential: number;
  // Factor breakdown
  factors: Record<string, number>;
  // Suggestions (tiered)
  suggestions: string[];
  // Competition adjustment info
  competitiveAdjustment: number; // multiplier applied
}

// ---- COMPETITION ADJUSTMENT CALCULATION ----

function calculateCorporateAdjustment(modifiers: CorporateModifiers): number {
  // Competition pressure = weighted combination of all modifiers
  const competitionPressure =
    (modifiers.roleDifficulty / 100) * 0.30 +
    (modifiers.companyCompetitiveness / 100) * 0.30 +
    modifiers.marketSaturation * 0.20 +
    modifiers.industryHiringTightness * 0.20;

  // Scaling factor controls how aggressively scores are reduced
  // 0.45 means max ~45% reduction at extreme competition
  const scalingFactor = 0.45;

  // Multiplier: ranges from ~0.55 to 1.0
  const multiplier = 1 - (competitionPressure * scalingFactor);

  // Clamp to never drop below 0.55 (prevents extreme drops)
  return Math.max(0.55, Math.min(1.0, multiplier));
}

function calculateFreelanceAdjustment(modifiers: FreelanceModifiers): number {
  const competitionPressure =
    (modifiers.platformCompetitionDensity / 100) * 0.30 +
    (modifiers.averageProposalVolume / 100) * 0.25 +
    modifiers.professionSaturation * 0.25 +
    modifiers.clusterCompetitionMultiplier * 0.20;

  const scalingFactor = 0.42;
  const multiplier = 1 - (competitionPressure * scalingFactor);

  return Math.max(0.55, Math.min(1.0, multiplier));
}

// ---- SCORE DISTRIBUTION CALIBRATION ----
// Target: 10% 30-45, 20% 45-55, 40% 55-70, 20% 70-80, 10% 80-90
// We use a sigmoid-like compression to push scores toward the center

function calibrateScore(rawAdjusted: number): number {
  // rawAdjusted is already competition-adjusted (0-100 range)
  // Apply distribution compression: push extremes toward center
  
  // Center point: 63 (target average ~62-68)
  const center = 63;
  const spread = 28; // controls distribution width
  
  // Soft compression: reduce distance from center by a factor
  const distanceFromCenter = rawAdjusted - center;
  const compressionFactor = 0.72; // 0-1, lower = tighter distribution
  const calibrated = center + (distanceFromCenter * compressionFactor);
  
  // Floor at 28, ceiling at 92
  return Math.max(28, Math.min(92, Math.round(calibrated)));
}

// ---- PERCENTILE & INTERPRETATION ----

function getPercentile(score: number): string {
  if (score >= 80) return 'Top 10%';
  if (score >= 70) return 'Top 20%';
  if (score >= 60) return 'Top 40%';
  if (score >= 50) return 'Top 60%';
  if (score >= 40) return 'Top 75%';
  return 'Bottom 30%';
}

function getCompetitionLevel(adjustmentMultiplier: number): CompetitionLevel {
  if (adjustmentMultiplier < 0.70) return 'High Competitive Pressure';
  if (adjustmentMultiplier < 0.85) return 'Moderate Competition';
  return 'Low Competition';
}

function getInterpretation(score: number, competitionLevel: CompetitionLevel): string {
  if (score >= 80) {
    return 'Strong optimization, but competition remains a factor. Your application stands out — maintain this quality.';
  }
  if (score >= 70) {
    return competitionLevel === 'High Competitive Pressure'
      ? 'Well-optimized application in a highly competitive field. Targeted improvements could push you into the top tier.'
      : 'Solid application with room for targeted improvement. Focus on the specific gaps below.';
  }
  if (score >= 55) {
    return 'Competitive application that needs sharper positioning. Focus on keyword alignment and specific proof points.';
  }
  if (score < 55) {
    return 'Optimization needed to compete effectively. Address the key gaps below to significantly improve your chances.';
  }
  return 'Competitive analysis complete. See breakdown for specific areas to improve.';
}

function getContextLabel(score: number): string {
  if (score >= 80) return 'Highly Competitive';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Competitive';
  if (score >= 40) return 'Developing';
  return 'Needs Optimization';
}

// ---- CORPORATE SCORING ENGINE ----

export interface CorporateScoreInput {
  keywordMatchPercent: number;
  experienceAlignScore: number;
  atsOptimizationPercent: number;
  roleDifficulty: number;
  companyCompetitiveness: number;
  // Optional enhanced modifiers
  marketSaturation?: number;
  industryHiringTightness?: number;
}

export function calculateCorporateScore(input: CorporateScoreInput): CompetitiveScoreResult {
  // Layer 1: Raw optimization score (pure quality, no competition)
  const rawScore =
    input.keywordMatchPercent * 0.30 +
    input.experienceAlignScore * 0.30 +
    input.atsOptimizationPercent * 0.20 +
    // Role/company add a small quality bonus for matching hard targets
    Math.max(0, (100 - input.roleDifficulty) * 0.10) +
    Math.max(0, (100 - input.companyCompetitiveness) * 0.10);

  const clampedRaw = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Layer 2: Apply competitive normalization
  const modifiers: CorporateModifiers = {
    roleDifficulty: input.roleDifficulty,
    companyCompetitiveness: input.companyCompetitiveness,
    marketSaturation: input.marketSaturation ?? estimateMarketSaturation(input.roleDifficulty),
    industryHiringTightness: input.industryHiringTightness ?? estimateHiringTightness(input.companyCompetitiveness),
  };

  const adjustment = calculateCorporateAdjustment(modifiers);
  const adjustedScore = clampedRaw * adjustment;
  const competitiveScore = calibrateScore(adjustedScore);

  // Improvement suggestions
  const suggestions: string[] = [];
  if (input.keywordMatchPercent < 60) suggestions.push('Increase keyword density — match job description terminology exactly');
  if (input.experienceAlignScore < 60) suggestions.push('Reframe experience using role-specific outcomes and quantified metrics');
  if (input.atsOptimizationPercent < 70) suggestions.push('Improve ATS compatibility — avoid tables, graphics, and non-standard headers');
  if (input.roleDifficulty > 80) suggestions.push('High-competition role — differentiate with unique project examples and measurable impact');
  if (input.companyCompetitiveness > 85) suggestions.push('Use company-specific language and reference their recent products or initiatives');
  if (input.keywordMatchPercent < 80 && input.atsOptimizationPercent < 80) suggestions.push('Cross-reference the job posting for missed technical terms and certifications');

  // Optimized potential (Elite simulation)
  const optimizedFactors = {
    keyword: Math.min(100, input.keywordMatchPercent + 20),
    experience: Math.min(100, input.experienceAlignScore + 15),
    ats: Math.min(100, input.atsOptimizationPercent + 25),
  };
  const optimizedRaw =
    optimizedFactors.keyword * 0.30 +
    optimizedFactors.experience * 0.30 +
    optimizedFactors.ats * 0.20 +
    Math.max(0, (100 - input.roleDifficulty) * 0.10) +
    Math.max(0, (100 - input.companyCompetitiveness) * 0.10);
  const optimizedPotential = calibrateScore(Math.min(100, optimizedRaw) * adjustment);

  const competitionLevel = getCompetitionLevel(adjustment);

  return {
    rawScore: clampedRaw,
    competitiveScore,
    percentile: getPercentile(competitiveScore),
    interpretation: getInterpretation(competitiveScore, competitionLevel),
    competitionLevel,
    contextLabel: getContextLabel(competitiveScore),
    optimizedPotential: Math.max(competitiveScore + 5, optimizedPotential),
    factors: {
      keywordMatch: input.keywordMatchPercent,
      experienceAlignment: input.experienceAlignScore,
      atsOptimization: input.atsOptimizationPercent,
      roleCompetitionImpact: Math.round((1 - input.roleDifficulty / 100) * 100),
      companyCompetitivenessImpact: Math.round((1 - input.companyCompetitiveness / 100) * 100),
    },
    suggestions: suggestions.slice(0, 5),
    competitiveAdjustment: adjustment,
  };
}

// ---- FREELANCE SCORING ENGINE ----

export interface FreelanceScoreInput {
  hookStrength: number;
  clientPainAlignment: number;
  skillRelevance: number;
  proofDensity: number;
  ctaClarity: number;
  lengthOptimization: number;
  platformCompetitiveness: number;
  clusterCalibration: number;
  // Optional enhanced modifiers
  averageProposalVolume?: number;
  professionSaturation?: number;
}

export function calculateFreelanceCompetitiveScore(input: FreelanceScoreInput): CompetitiveScoreResult {
  // Layer 1: Raw quality score
  const rawScore =
    input.hookStrength * 0.18 +
    input.clientPainAlignment * 0.20 +
    input.skillRelevance * 0.18 +
    input.proofDensity * 0.12 +
    input.ctaClarity * 0.10 +
    input.lengthOptimization * 0.07 +
    (100 - input.platformCompetitiveness) * 0.08 +
    input.clusterCalibration * 0.07;

  const clampedRaw = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Layer 2: Competitive normalization
  const modifiers: FreelanceModifiers = {
    platformCompetitionDensity: input.platformCompetitiveness,
    averageProposalVolume: input.averageProposalVolume ?? estimateProposalVolume(input.platformCompetitiveness),
    professionSaturation: input.professionSaturation ?? estimateProfessionSaturation(input.clusterCalibration),
    clusterCompetitionMultiplier: Math.max(0, Math.min(1, (100 - input.clusterCalibration) / 100)),
  };

  const adjustment = calculateFreelanceAdjustment(modifiers);
  const adjustedScore = clampedRaw * adjustment;
  const competitiveScore = calibrateScore(adjustedScore);

  // Suggestions
  const suggestions: string[] = [];
  if (input.hookStrength < 60) suggestions.push('Strengthen your opening hook — reference a specific detail from the client\'s brief');
  if (input.clientPainAlignment < 60) suggestions.push('Better align your proposal with the client\'s core pain points');
  if (input.skillRelevance < 60) suggestions.push('Highlight skills that directly match the project requirements');
  if (input.proofDensity < 50) suggestions.push('Add concrete proof: portfolio links, metrics, or testimonials');
  if (input.ctaClarity < 60) suggestions.push('End with a clear, specific call-to-action (e.g., "I can deliver a first draft by Friday")');
  if (input.lengthOptimization < 50) suggestions.push('Adjust proposal length — too short lacks substance, too long loses attention');
  if (input.platformCompetitiveness > 70) suggestions.push('High-competition platform — lead with a unique differentiator in your first sentence');

  // Optimized potential
  const optimizedRaw =
    Math.min(100, input.hookStrength + 20) * 0.18 +
    Math.min(100, input.clientPainAlignment + 15) * 0.20 +
    Math.min(100, input.skillRelevance + 15) * 0.18 +
    Math.min(100, input.proofDensity + 25) * 0.12 +
    Math.min(100, input.ctaClarity + 20) * 0.10 +
    Math.min(100, input.lengthOptimization + 15) * 0.07 +
    (100 - input.platformCompetitiveness) * 0.08 +
    Math.min(100, input.clusterCalibration + 10) * 0.07;
  const optimizedPotential = calibrateScore(Math.min(100, optimizedRaw) * adjustment);

  const competitionLevel = getCompetitionLevel(adjustment);

  return {
    rawScore: clampedRaw,
    competitiveScore,
    percentile: getPercentile(competitiveScore),
    interpretation: getInterpretation(competitiveScore, competitionLevel),
    competitionLevel,
    contextLabel: getContextLabel(competitiveScore),
    optimizedPotential: Math.max(competitiveScore + 5, optimizedPotential),
    factors: {
      hookStrength: input.hookStrength,
      clientPainAlignment: input.clientPainAlignment,
      skillRelevance: input.skillRelevance,
      proofDensity: input.proofDensity,
      ctaClarity: input.ctaClarity,
      lengthOptimization: input.lengthOptimization,
      platformCompetitionImpact: Math.round((1 - input.platformCompetitiveness / 100) * 100),
      clusterFit: input.clusterCalibration,
    },
    suggestions: suggestions.slice(0, 5),
    competitiveAdjustment: adjustment,
  };
}

// ---- ESTIMATION HELPERS (derive missing modifiers from available data) ----

function estimateMarketSaturation(roleDifficulty: number): number {
  // Higher difficulty roles tend to have higher market saturation
  return Math.min(1, (roleDifficulty / 100) * 0.8 + 0.1);
}

function estimateHiringTightness(companyCompetitiveness: number): number {
  return Math.min(1, (companyCompetitiveness / 100) * 0.75 + 0.1);
}

function estimateProposalVolume(platformCompetitiveness: number): number {
  return Math.min(100, platformCompetitiveness * 0.9 + 10);
}

function estimateProfessionSaturation(clusterCalibration: number): number {
  // Lower calibration = more generic = more saturated
  return Math.min(1, Math.max(0, (100 - clusterCalibration) / 100 * 0.7 + 0.15));
}

// ---- FACTOR LABELS ----

export const CORPORATE_FACTOR_LABELS: Record<string, string> = {
  keywordMatch: 'Keyword Match',
  experienceAlignment: 'Experience Alignment',
  atsOptimization: 'ATS Optimization',
  roleCompetitionImpact: 'Role Competition Impact',
  companyCompetitivenessImpact: 'Company Competitiveness Impact',
};

export const FREELANCE_FACTOR_LABELS: Record<string, string> = {
  hookStrength: 'Hook Strength',
  clientPainAlignment: 'Client Pain Alignment',
  skillRelevance: 'Skill Relevance',
  proofDensity: 'Proof Density',
  ctaClarity: 'CTA Clarity',
  lengthOptimization: 'Length Optimization',
  platformCompetitionImpact: 'Platform Competition Impact',
  clusterFit: 'Cluster Fit',
};
