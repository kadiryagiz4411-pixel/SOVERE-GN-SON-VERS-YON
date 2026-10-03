import { toast } from 'sonner';

export const OPENAI_DOWN_TOAST =
  "AI Servisi Yanıt Vermedi - Lütfen API Anahtarınızı ve Kotanızı Kontrol Edin";

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function messageForOpenAIStatus(status: number, body = ''): string {
  if (status === 401) {
    return 'OpenAI API Anahtarı Geçersiz (401). Lütfen Ayarlar sayfasından anahtarınızı kontrol edin.';
  }
  if (status === 429) {
    return 'OpenAI API kota sınırına ulaşıldı (429). Lütfen bir süre bekleyin veya farklı bir anahtar deneyin.';
  }
  const clean = stripHtml(body).slice(0, 160);
  return clean
    ? `OpenAI API Hatası (HTTP ${status}): ${clean}`
    : `OpenAI API Hatası (HTTP ${status})`;
}

export function toastOpenAIFailure(status?: number): void {
  toast.error(OPENAI_DOWN_TOAST, {
    id: status === 401 || status === 429 ? `sovereign-openai-${status}` : 'sovereign-ai-down',
    duration: 8000,
  });
}
