const API_BASE_URL = 'https://sovereignapp.pro';
const BUILD_AT = '2026-10-30T02:23:04.717Z'; // auto-injected by buildExtensionZip.mjs
const PARSE_DOM_PATH = '/api/extension/parse-dom';
const GENERATE_CV_PATH = '/api/generate-cv';
const SMART_MATCH_PATH = '/api/smart-match';
const EXTENSION_ME_PATH = '/api/extension/me';
const EXTENSION_VERSION = '1.7.7';
const ADMIN_EMAILS = ['kadiryagiz4411@gmail.com'];

function canonicalizeApiBase(raw) {
  const fallback = 'https://sovereignapp.pro';
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  if (!trimmed) return fallback;
  try {
    const withProto = /^(https?:)?\/\//i.test(trimmed)
      ? trimmed.replace(/^http:\/\//i, 'https://').replace(/^\/\//, 'https://')
      : `https://${trimmed.replace(/^https?:\/\//i, '')}`;
    const url = new URL(withProto);
    url.protocol = 'https:';
    if (url.hostname === 'www.sovereignapp.pro') url.hostname = 'sovereignapp.pro';
    return url.origin;
  } catch {
    return fallback;
  }
}
