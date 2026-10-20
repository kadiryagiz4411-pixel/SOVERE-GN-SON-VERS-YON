import { toast } from 'sonner';

function uiLanguage(): string {
  try {
    return localStorage.getItem('sovereign-language') || 'en';
  } catch {
    return 'en';
  }
}

export const OPENAI_DOWN_TOAST =
  'AI service did not respond. Check your API key and quota.';

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function messageForOpenAIStatus(status: number, body = ''): string {
  const lang = uiLanguage();
  if (status === 401) {
    return lang === 'tr'
      ? 'OpenAI API anahtarı geçersiz (401). Lütfen Ayarlar sayfasından anahtarınızı kontrol edin.'
      : 'OpenAI API key is invalid (401). Check the key in Settings.';
  }
  if (status === 429) {
    return lang === 'tr'
      ? 'OpenAI API kota sınırına ulaşıldı (429). Lütfen bir süre bekleyin veya farklı bir anahtar deneyin.'
      : 'OpenAI rate limit reached (429). Wait a moment or try a different key.';
  }
  const clean = stripHtml(body).slice(0, 160);
  return clean
    ? `OpenAI API error (HTTP ${status}): ${clean}`
    : `OpenAI API error (HTTP ${status})`;
}

export function toastOpenAIFailure(status?: number): void {
  const lang = uiLanguage();
  const message = lang === 'tr'
    ? 'AI servisi yanıt vermedi. API anahtarınızı ve kotanızı kontrol edin.'
    : OPENAI_DOWN_TOAST;
  toast.error(message, {
    id: status === 401 || status === 429 ? `sovereign-openai-${status}` : 'sovereign-ai-down',
    duration: 8000,
  });
}
