import { json, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';

export const config = { runtime: 'nodejs' };

const CATALOG = [
  'react-developer-for-shopify',
  'python-web-scraping-proposal',
  'next-js-saas-developer',
  'wordpress-woocommerce-developer',
  'shopify-plus-developer',
  'laravel-api-developer',
  'react-native-mobile-app',
  'figma-ui-ux-designer',
  'python-data-analyst',
  'node-js-backend-engineer',
  'typescript-full-stack',
  'ai-chatgpt-automation',
  'seo-content-writer',
  'webflow-designer',
  'flutter-app-developer',
  'salesforce-admin',
  'aws-devops-engineer',
  'graphql-api-developer',
  'supabase-full-stack',
  'go-microservices',
  'vue-nuxt-developer',
  'machine-learning-engineer',
  'copywriter-for-saas',
  'php-laravel-woocommerce',
];

function slugifyStack(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const slug = slugifyStack(url.searchParams.get('slug') || '');
    if (slug) {
      return json({ slug, url: `/proposals-for/${slug}`, known: CATALOG.includes(slug) });
    }
    return json({
      stacks: CATALOG.map((item) => ({ slug: item, url: `/proposals-for/${item}` })),
    });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as { jobTitle?: string; query?: string; jobUrl?: string };
    const source = String(body.query || body.jobTitle || '').trim();
    const slug = slugifyStack(source);
    if (!slug) return json({ error: 'jobTitle is required' }, 400);
    return json({
      created: true,
      slug,
      url: `/proposals-for/${slug}`,
      sourceUrl: body.jobUrl || null,
    });
  }

  return json({ error: 'Method not allowed' }, 405);
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const POST = api.POST;
export default api;
