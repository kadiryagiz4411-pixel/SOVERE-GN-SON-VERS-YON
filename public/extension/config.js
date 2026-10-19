const API_BASE_URL = 'https://www.sovereignapp.pro';
const PARSE_DOM_PATH = '/api/extension/parse-dom';

function canonicalizeApiBase(raw) {
  const fallback = 'https://www.sovereignapp.pro';
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  if (!trimmed) return fallback;
  try {
    const withProto = /^(https?:)?\/\//i.test(trimmed)
      ? trimmed.replace(/^http:\/\//i, 'https://').replace(/^\/\//, 'https://')
      : `https://${trimmed.replace(/^https?:\/\//i, '')}`;
    const url = new URL(withProto);
    url.protocol = 'https:';
    if (url.hostname === 'sovereignapp.pro') url.hostname = 'www.sovereignapp.pro';
    return url.origin;
  } catch {
    return fallback;
  }
}
