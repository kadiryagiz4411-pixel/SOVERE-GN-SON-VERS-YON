export interface ProposalStack {
  slug: string;
  query: string;
  stack: string[];
  headline: string;
  intent: string;
  hooks: string[];
  gaps: string[];
}

const RAW_STACKS: Array<Omit<ProposalStack, 'slug'>> = [
  { query: 'React developer for Shopify', stack: ['React', 'Shopify', 'Liquid'], intent: 'storefront and checkout work', headline: 'React developers pitching Shopify brands', hooks: ['Ship the collection page this week', 'Keep checkout conversion intact'], gaps: ['Liquid', 'Checkout extensibility'] },
  { query: 'Python web scraping proposal', stack: ['Python', 'Scrapy', 'Playwright'], intent: 'reliable extraction jobs', headline: 'Python scrapers who do not get blocked', hooks: ['First 1,000 rows in 48 hours', 'Retry + proxy plan'], gaps: ['CAPTCHA', 'Schema drift'] },
  { query: 'Next.js SaaS developer', stack: ['Next.js', 'TypeScript', 'Stripe'], intent: 'MVP and billing work', headline: 'Next.js proposals that win SaaS briefs', hooks: ['Auth + billing in week one', 'Preview URL on day two'], gaps: ['Stripe webhooks', 'RLS'] },
  { query: 'WordPress WooCommerce developer', stack: ['WordPress', 'WooCommerce', 'PHP'], intent: 'store rebuilds', headline: 'WooCommerce proposals that convert', hooks: ['Migrate catalog without downtime', 'Fix checkout errors first'], gaps: ['HPOS', 'payment gateway'] },
  { query: 'Shopify Plus developer', stack: ['Shopify Plus', 'Checkout Extensibility', 'Hydrogen'], intent: 'enterprise storefronts', headline: 'Shopify Plus proposal templates', hooks: ['Checkout extensibility without apps bloat', 'B2B catalogs'], gaps: ['Functions', 'plus checkout'] },
  { query: 'Laravel API developer', stack: ['Laravel', 'PHP', 'MySQL'], intent: 'API and admin work', headline: 'Laravel proposals for API briefs', hooks: ['OpenAPI on day one', 'Queue the slow jobs'], gaps: ['Horizon', 'sanctum'] },
  { query: 'React Native mobile app', stack: ['React Native', 'TypeScript', 'Expo'], intent: 'cross-platform apps', headline: 'React Native freelance proposals', hooks: ['TestFlight / Play build this week', 'Offline-first list'], gaps: ['push notifications', 'OTA'] },
  { query: 'Figma UI UX designer', stack: ['Figma', 'UI', 'UX'], intent: 'product design', headline: 'Figma proposals that get shortlisted', hooks: ['Audit + 3 screens in 72 hours', 'Dev-ready components'], gaps: ['design system', 'handoff'] },
  { query: 'Python data analyst', stack: ['Python', 'Pandas', 'SQL'], intent: 'dashboards and pipelines', headline: 'Python analyst proposal pages', hooks: ['First dashboard from your CSV', 'Document every metric'], gaps: ['warehouse', 'dbt'] },
  { query: 'Node.js backend engineer', stack: ['Node.js', 'Express', 'PostgreSQL'], intent: 'API ownership', headline: 'Node.js backend proposals', hooks: ['Health checks + tests first', 'Idempotent webhooks'], gaps: ['queues', 'observability'] },
  { query: 'TypeScript full stack', stack: ['TypeScript', 'React', 'Node.js'], intent: 'end-to-end product work', headline: 'TypeScript full-stack proposals', hooks: ['One repo, typed contracts', 'Ship a vertical slice'], gaps: ['CI', 'e2e'] },
  { query: 'AI ChatGPT automation', stack: ['OpenAI', 'Python', 'automation'], intent: 'agent and workflow jobs', headline: 'AI automation proposal templates', hooks: ['Human-in-the-loop first', 'Eval set before prompt spam'], gaps: ['evals', 'cost caps'] },
  { query: 'SEO content writer', stack: ['SEO', 'content', 'copywriting'], intent: 'ranking pages', headline: 'SEO proposal pages that rank', hooks: ['Outline + first article in 48h', 'Search intent map'], gaps: ['internal links', 'schema'] },
  { query: 'Webflow designer', stack: ['Webflow', 'CMS', 'design'], intent: 'marketing sites', headline: 'Webflow freelance proposals', hooks: ['CMS collections on day one', 'Client editor training'], gaps: ['SEO schema', 'speed'] },
  { query: 'Flutter app developer', stack: ['Flutter', 'Dart', 'Firebase'], intent: 'mobile delivery', headline: 'Flutter proposal templates', hooks: ['One codebase, two stores', 'Crash-free first build'], gaps: ['CI flavors', 'IAP'] },
  { query: 'Salesforce admin', stack: ['Salesforce', 'Apex', 'Flows'], intent: 'CRM cleanup', headline: 'Salesforce freelance proposals', hooks: ['Audit unused fields first', 'Flow before Apex'], gaps: ['permission sets', 'reports'] },
  { query: 'AWS DevOps engineer', stack: ['AWS', 'Terraform', 'Docker'], intent: 'infra and deploys', headline: 'AWS DevOps proposals', hooks: ['Reproducible env this week', 'Rollback plan'], gaps: ['IAM', 'observability'] },
  { query: 'GraphQL API developer', stack: ['GraphQL', 'Node.js', 'Apollo'], intent: 'schema work', headline: 'GraphQL proposal pages', hooks: ['Schema first, resolvers second', 'N+1 audit'], gaps: ['dataloader', 'auth'] },
  { query: 'Supabase full stack', stack: ['Supabase', 'React', 'Postgres'], intent: 'auth + data apps', headline: 'Supabase proposal templates', hooks: ['RLS on every table', 'Auth in a day'], gaps: ['policies', 'edge functions'] },
  { query: 'Go microservices', stack: ['Go', 'gRPC', 'Kubernetes'], intent: 'service splits', headline: 'Go microservice proposals', hooks: ['One service extracted first', 'SLA + health'], gaps: ['tracing', 'contracts'] },
  { query: 'Vue Nuxt developer', stack: ['Vue', 'Nuxt', 'TypeScript'], intent: 'SSR apps', headline: 'Vue / Nuxt freelance proposals', hooks: ['SSR + SEO in week one', 'Composable data layer'], gaps: ['hydration', 'i18n'] },
  { query: 'Machine learning engineer', stack: ['Python', 'PyTorch', 'ML'], intent: 'model work', headline: 'ML engineer proposal pages', hooks: ['Baseline before a custom model', 'Eval notebook'], gaps: ['data quality', 'latency'] },
  { query: 'Copywriter for SaaS', stack: ['copywriting', 'SaaS', 'conversion'], intent: 'landing and onboarding copy', headline: 'SaaS copywriter proposals', hooks: ['Rewrite the hero first', 'One CTA per screen'], gaps: ['proof', 'objection handling'] },
  { query: 'PHP Laravel WooCommerce', stack: ['PHP', 'Laravel', 'WooCommerce'], intent: 'hybrid store backends', headline: 'Laravel + Woo proposals', hooks: ['Keep checkout, replace the admin', 'Sync stock nightly'], gaps: ['webhooks', 'HPOS'] },
];

export function slugifyStack(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function titleFromSlug(slug: string): string {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function withSlug(entry: Omit<ProposalStack, 'slug'>): ProposalStack {
  return { ...entry, slug: slugifyStack(entry.query) };
}

export const PROPOSAL_STACKS: ProposalStack[] = RAW_STACKS.map(withSlug);

export function listProposalStackSlugs(): string[] {
  return PROPOSAL_STACKS.map((stack) => stack.slug);
}

export function stackFromSlug(slug: string): ProposalStack | null {
  const clean = slugifyStack(slug);
  if (!clean) return null;
  const known = PROPOSAL_STACKS.find((stack) => stack.slug === clean);
  if (known) return known;
  const title = titleFromSlug(clean);
  const tokens = clean.split('-').filter((word) => word.length > 2).slice(0, 6);
  return {
    slug: clean,
    query: title,
    stack: tokens.map((word) => word.charAt(0).toUpperCase() + word.slice(1)),
    headline: `${title} proposals that get shortlisted`,
    intent: `${title} freelance jobs`,
    hooks: [`Lead with a first-week result for ${title}`, 'Name the client pain in sentence one'],
    gaps: tokens.slice(0, 3),
  };
}
