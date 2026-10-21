import { toast } from 'sonner';

function uiLanguage(): string {
  try {
    return localStorage.getItem('sovereign-language') || 'en';
  } catch {
    return 'en';
  }
}

export const OPENAI_DOWN_TOAST =
  'AI engine is currently updating. Please try again in a few moments.';

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function messageForOpenAIStatus(status: number, body = ''): string {
  const lang = uiLanguage();
  if (status === 401 || status === 429 || status >= 500) {
    return lang === 'tr'
      ? 'AI motoru şu anda güncelleniyor. Lütfen birkaç dakika sonra tekrar deneyin.'
      : OPENAI_DOWN_TOAST;
  }
  const clean = stripHtml(body).slice(0, 160);
  if (/openai|api key|vercel|stack/i.test(clean)) return OPENAI_DOWN_TOAST;
  return lang === 'tr'
    ? 'Servis geçici olarak meşgul. Lütfen tekrar deneyin.'
    : 'Service temporarily busy. Please try again.';
}

export function publicUserError(raw: unknown, admin = false): string {
  const text = String(raw instanceof Error ? raw.message : raw || '').trim();
  if (admin && text) return text;
  if (/openai|api key|vercel|OPENAI|stack|Check Vercel|Configuration Error|environment variable/i.test(text)) {
    return OPENAI_DOWN_TOAST;
  }
  if (/Failed to fetch|NetworkError|CORS|preflight|TypeError/i.test(text)) {
    return 'Service temporarily busy. Please try again in a few moments.';
  }
  return text || 'Service temporarily busy. Please try again in a few moments.';
}

export function toastOpenAIFailure(status?: number): void {
  const lang = uiLanguage();
  const message = lang === 'tr'
    ? 'AI motoru şu anda güncelleniyor. Lütfen birkaç dakika sonra tekrar deneyin.'
    : OPENAI_DOWN_TOAST;
  toast.error(message, {
    id: status === 401 || status === 429 ? `sovereign-openai-${status}` : 'sovereign-ai-down',
    duration: 8000,
  });
}
