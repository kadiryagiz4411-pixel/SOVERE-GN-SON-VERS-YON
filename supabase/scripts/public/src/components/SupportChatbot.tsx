import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const FAQ: Record<string, { q: string[]; a: string }[]> = {
  en: [
    { q: ['pricing', 'cost', 'price', 'how much', 'plan'], a: 'We offer 3 plans: Free, Pro ($14 monthly / $99 yearly), and Elite ($39 monthly / $299 yearly). Payments are processed securely via Lemon Squeezy. Visit our Pricing page for details.' },
    { q: ['trial', 'free trial', 'try'], a: 'Yes! We offer a limited free trial for Pro features. Look for the "Claim Free Trial" banner on your dashboard after signing up.' },
    { q: ['cancel', 'refund', 'money back'], a: 'We use secure payments via Lemon Squeezy. For refund requests, please contact support@sovereign.app within 30 days of purchase.' },
    { q: ['how', 'work', 'use', 'start', 'begin'], a: '1. Sign up for free\n2. Paste a job description in the dashboard\n3. Click "Analyze" to get your AI-optimized proposal\n4. Copy, download, or email the result directly!' },
    { q: ['elite', 'strategy', 'analytics'], a: 'Elite includes: visual acceptance graphs, company match recommendations, decision-maker identification, multi-channel outreach messages, and a full application strategy.' },
    { q: ['pro', 'acceptance', 'score', 'probability'], a: 'Pro gives you acceptance probability scoring (%), company-specific optimization, tone selection, unlimited proposals, and proposal history.' },
    { q: ['tone', 'aggressive', 'calm', 'professional'], a: 'Pro and Elite users can choose from 4 tones: Professional, Aggressive, Calm, and Consistent. Each adjusts how your proposal reads to match different company cultures.' },
    { q: ['download', 'export', 'email', 'save'], a: 'You can copy, download as .txt, or email your proposal directly from the dashboard. Pro/Elite users can also save to their proposal history.' },
    { q: ['language', 'turkish', 'german', 'french'], a: 'Sovereign supports English, Turkish, German, and French. The AI automatically detects the job posting language and generates proposals accordingly.' },
    { q: ['contact', 'support', 'help', 'email'], a: 'You can reach us at support@sovereign.app. We typically respond within 24 hours.' },
  ],
  tr: [
    { q: ['fiyat', 'ücret', 'plan', 'kaç'], a: '3 plan sunuyoruz: Ücretsiz, Pro (aylık 14$ / yıllık 99$) ve Elite (aylık 39$ / yıllık 299$). Ödemeler Lemon Squeezy ile güvenli şekilde alınır. Detaylar için Fiyatlandırma sayfamızı ziyaret edin.' },
    { q: ['deneme', 'trial', 'ücretsiz'], a: 'Evet! Pro özellikleri için sınırlı ücretsiz deneme sunuyoruz. Kaydolduktan sonra panelinizdeki "Ücretsiz Deneme" bannerine bakın.' },
    { q: ['iptal', 'iade', 'para'], a: 'Lemon Squeezy üzerinden güvenli ödeme alıyoruz. İade talepleri için satın alma sonrası 30 gün içinde support@sovereign.app adresine ulaşın.' },
    { q: ['nasıl', 'kullan', 'başla'], a: '1. Ücretsiz kayıt olun\n2. İş ilanını panele yapıştırın\n3. "Analiz Et" ile AI destekli teklif alın\n4. Kopyalayın, indirin veya e-posta ile gönderin!' },
    { q: ['elite', 'strateji', 'analitik'], a: 'Elite şunları içerir: görsel kabul grafikleri, şirket eşleşme önerileri, karar verici tespiti, çok kanallı iletişim mesajları ve tam başvuru stratejisi.' },
    { q: ['ton', 'agresif', 'sakin', 'profesyonel'], a: 'Pro ve Elite kullanıcılar 4 ton seçebilir: Profesyonel, Agresif, Sakin ve Tutarlı. Her biri teklif üslubunu farklı şirket kültürlerine uyacak şekilde ayarlar.' },
    { q: ['dil', 'türkçe', 'almanca', 'fransızca'], a: 'Sovereign İngilizce, Türkçe, Almanca ve Fransızca destekler. AI, iş ilanı dilini otomatik algılayıp buna göre teklif üretir.' },
    { q: ['iletişim', 'destek', 'yardım'], a: 'Bize support@sovereign.app adresinden ulaşabilirsiniz. Genellikle 24 saat içinde yanıt veriyoruz.' },
  ],
};

export const SupportChatbot = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const faq = FAQ[language] || FAQ.en;

  const greeting = language === 'tr'
    ? 'Merhaba! 👋 Sovereign hakkında sorularınızı yanıtlamak için buradayım. Nasıl yardımcı olabilirim?'
    : 'Hi! 👋 I\'m here to help with questions about Sovereign. How can I assist you?';

  const noMatch = language === 'tr'
    ? 'Bu konuda kesin bir yanıt bulamadım. Daha detaylı yardım için support@sovereign.app adresine ulaşabilirsiniz. Fiyatlandırma, özellikler veya nasıl kullanılır gibi konularda sorabilirsiniz!'
    : 'I couldn\'t find a specific answer for that. For detailed help, reach us at support@sovereign.app. You can ask about pricing, features, or how to get started!';

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const findAnswer = (q: string): string => {
    const lower = q.toLowerCase();
    for (const item of faq) {
      if (item.q.some(keyword => lower.includes(keyword))) {
        return item.a;
      }
    }
    return noMatch;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const answer = findAnswer(userMsg.content);
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Support chat"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 lg:bottom-20 lg:right-6 z-50 w-80 max-h-[420px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Sovereign Support</p>
              <p className="text-xs opacity-80">{language === 'tr' ? 'Yardım & SSS' : 'Help & FAQ'}</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[280px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-3 py-2 rounded-xl text-sm flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {language === 'tr' ? 'Yazıyor...' : 'Typing...'}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={language === 'tr' ? 'Sorunuzu yazın...' : 'Ask a question...'}
              className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
