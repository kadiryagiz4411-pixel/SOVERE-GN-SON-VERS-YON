/**
 * Sitemap Auto-Generator
 * Generates sitemap.xml from all programmatic SEO routes
 * Run: npx tsx scripts/generate-sitemap.ts
 */

const DOMAIN = 'https://sovereignapp.pro';

const COMPANIES = [
  'google','meta','amazon','apple','microsoft','netflix','stripe',
  'airbnb','uber','spotify','notion','figma','vercel','shopify',
  'salesforce','hubspot','linear','openai','anthropic','datadog',
  'trendyol','insider','getir','wise','revolut',
];

const ROLES = [
  'software-engineer','product-manager','data-scientist','ux-designer',
  'machine-learning-engineer','solutions-architect','content-strategist',
  'developer-advocate','operations-manager','researcher',
];

const PROFESSIONS = [
  'logo-designer','graphic-designer','beatmaker','video-editor','motion-designer',
  'web-developer','backend-engineer','ai-developer','data-analyst','blockchain-developer',
  'copywriter','seo-specialist','media-buyer','growth-marketer','social-media-manager',
  'product-consultant','operations-consultant','sales-consultant',
];

const LANGUAGES = [
  'turkish','german','french','spanish','portuguese','italian','dutch',
  'polish','russian','japanese','korean','chinese','arabic','hindi',
  'indonesian','vietnamese','thai','swedish','danish','norwegian',
  'finnish','czech','romanian','greek','ukrainian','hungarian',
  'hebrew','malay','filipino',
];

const COMPANY_ROLE_PAIRS: [string, string][] = [
  ['google','software-engineer'],['google','product-manager'],['google','data-scientist'],['google','ux-designer'],
  ['meta','software-engineer'],['meta','product-manager'],['meta','data-scientist'],['meta','machine-learning-engineer'],
  ['amazon','software-engineer'],['amazon','product-manager'],['amazon','solutions-architect'],['amazon','data-scientist'],
  ['apple','software-engineer'],['apple','ux-designer'],['apple','product-manager'],
  ['microsoft','software-engineer'],['microsoft','product-manager'],['microsoft','solutions-architect'],
  ['netflix','software-engineer'],['netflix','data-scientist'],['netflix','product-manager'],
  ['stripe','software-engineer'],['stripe','product-manager'],['stripe','solutions-architect'],
  ['airbnb','software-engineer'],['airbnb','product-manager'],['airbnb','ux-designer'],
  ['uber','software-engineer'],['uber','product-manager'],['uber','data-scientist'],
  ['spotify','software-engineer'],['spotify','data-scientist'],['spotify','ux-designer'],
  ['notion','software-engineer'],['notion','product-manager'],['notion','ux-designer'],
  ['figma','software-engineer'],['figma','ux-designer'],['figma','product-manager'],
  ['vercel','software-engineer'],['vercel','solutions-architect'],
  ['shopify','software-engineer'],['shopify','product-manager'],['shopify','ux-designer'],
  ['openai','machine-learning-engineer'],['openai','software-engineer'],['openai','researcher'],
  ['anthropic','machine-learning-engineer'],['anthropic','researcher'],['anthropic','software-engineer'],
  ['datadog','software-engineer'],['datadog','solutions-architect'],
  ['trendyol','software-engineer'],['trendyol','product-manager'],['trendyol','data-scientist'],
  ['salesforce','software-engineer'],['salesforce','solutions-architect'],
  ['hubspot','software-engineer'],['hubspot','product-manager'],
  ['wise','software-engineer'],['wise','product-manager'],
  ['revolut','software-engineer'],['revolut','machine-learning-engineer'],
];

export function generateSitemapXML(): string {
  const today = new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: `${DOMAIN}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${DOMAIN}/pricing`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${DOMAIN}/features`, priority: '0.8', changefreq: 'monthly' },
  ];

  const getHiredUrls = COMPANIES.map((c) => ({
    loc: `${DOMAIN}/get-hired-at/${c}`, priority: '0.8', changefreq: 'monthly', lastmod: today,
  }));

  const howToGetUrls = COMPANIES.map((c) => ({
    loc: `${DOMAIN}/how-to-get-job-at/${c}`, priority: '0.7', changefreq: 'monthly', lastmod: today,
  }));

  const atsCheckerUrls = ROLES.map((r) => ({
    loc: `${DOMAIN}/ats-resume-checker/${r}`, priority: '0.8', changefreq: 'monthly', lastmod: today,
  }));

  const bestResumeUrls = ROLES.map((r) => ({
    loc: `${DOMAIN}/best-resume-for/${r}`, priority: '0.7', changefreq: 'monthly', lastmod: today,
  }));

  const resumeForUrls = COMPANY_ROLE_PAIRS.map(([c, r]) => ({
    loc: `${DOMAIN}/resume-for/${c}/${r}`, priority: '0.8', changefreq: 'monthly', lastmod: today,
  }));

  // Acceptance rate pages
  const acceptanceRateUrls = COMPANY_ROLE_PAIRS.map(([c, r]) => ({
    loc: `${DOMAIN}/acceptance-rate/${c}/${r}`, priority: '0.8', changefreq: 'monthly', lastmod: today,
  }));

  // Freelance proposal pages
  const upworkUrls = PROFESSIONS.map((p) => ({
    loc: `${DOMAIN}/upwork-proposal/${p}`, priority: '0.8', changefreq: 'monthly', lastmod: today,
  }));
  const fiverrUrls = PROFESSIONS.map((p) => ({
    loc: `${DOMAIN}/fiverr-proposal/${p}`, priority: '0.8', changefreq: 'monthly', lastmod: today,
  }));
  const bestProposalUrls = PROFESSIONS.map((p) => ({
    loc: `${DOMAIN}/best-proposal/${p}`, priority: '0.7', changefreq: 'monthly', lastmod: today,
  }));

  // Language pages (top 10 languages × top professions)
  const topLangs = LANGUAGES.slice(0, 10);
  const topProfs = PROFESSIONS.slice(0, 8);
  const topRoles = ROLES.slice(0, 5);

  const proposalLangUrls = topProfs.flatMap((p) =>
    topLangs.map((l) => ({
      loc: `${DOMAIN}/proposal/${p}/${l}`, priority: '0.6', changefreq: 'monthly', lastmod: today,
    }))
  );

  const resumeLangUrls = topRoles.flatMap((r) =>
    topLangs.map((l) => ({
      loc: `${DOMAIN}/resume/${r}/${l}`, priority: '0.6', changefreq: 'monthly', lastmod: today,
    }))
  );

  const templateUrls = topProfs.flatMap((p) =>
    topLangs.map((l) => ({
      loc: `${DOMAIN}/proposal-template/${p}/${l}`, priority: '0.5', changefreq: 'monthly', lastmod: today,
    }))
  );

  const allUrls = [
    ...staticUrls,
    ...getHiredUrls,
    ...howToGetUrls,
    ...atsCheckerUrls,
    ...bestResumeUrls,
    ...resumeForUrls,
    ...acceptanceRateUrls,
    ...upworkUrls,
    ...fiverrUrls,
    ...bestProposalUrls,
    ...proposalLangUrls,
    ...resumeLangUrls,
    ...templateUrls,
  ];

  const urlEntries = allUrls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}
