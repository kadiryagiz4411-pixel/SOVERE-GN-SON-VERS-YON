import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Share2, Twitter, Linkedin, Facebook, Link2, Check, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface SocialShareProps {
  url?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'floating';
}

export const SocialShare = ({ 
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = 'Sovereign - Stop Getting Rejected',
  description = 'AI-powered application acceptance system that tells you exactly why your applications fail—and how to get accepted.',
  variant = 'default'
}: SocialShareProps) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const translations: Record<string, Record<string, string>> = {
    en: {
      share: 'Share',
      copyLink: 'Copy Link',
      copied: 'Copied!',
      shareOn: 'Share on',
      moreApps: 'More Apps...',
      whatsapp: 'WhatsApp',
    },
    tr: {
      share: 'Paylaş',
      copyLink: 'Bağlantıyı Kopyala',
      copied: 'Kopyalandı!',
      shareOn: 'Paylaş:',
      moreApps: 'Diğer Uygulamalar...',
      whatsapp: 'WhatsApp',
    },
    de: {
      share: 'Teilen',
      copyLink: 'Link kopieren',
      copied: 'Kopiert!',
      shareOn: 'Teilen auf',
      moreApps: 'Weitere Apps...',
      whatsapp: 'WhatsApp',
    },
    fr: {
      share: 'Partager',
      copyLink: 'Copier le lien',
      copied: 'Copié!',
      shareOn: 'Partager sur',
      moreApps: 'Plus d\'apps...',
      whatsapp: 'WhatsApp',
    },
  };

  const t = translations[language] || translations.en;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(`${title} - ${description}`);

  const shareLinks = [
    {
      name: 'Twitter / X',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: 'hover:text-[hsl(203,89%,53%)]',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:text-[hsl(210,83%,40%)]',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:text-[hsl(214,89%,52%)]',
    },
    {
      name: t.whatsapp,
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: 'hover:text-[hsl(142,70%,45%)]',
    },
  ];

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title,
        text: description,
        url,
      });
    } catch (err: unknown) {
      // User cancelled or error — ignore AbortError
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Share failed');
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-40 right-4 lg:bottom-24 lg:right-6 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="w-12 h-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {shareLinks.map((link) => (
              <DropdownMenuItem key={link.name} asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${link.color}`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </a>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {supportsNativeShare && (
              <DropdownMenuItem onClick={handleNativeShare} className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                {t.moreApps}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyToClipboard} className="flex items-center gap-2">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
              {copied ? t.copied : t.copyLink}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t.shareOn}</span>
      <div className="flex items-center gap-1">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-full hover:bg-muted transition-colors ${link.color}`}
            title={link.name}
          >
            <link.icon className="w-4 h-4" />
          </a>
        ))}
        {supportsNativeShare && (
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title={t.moreApps}
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={copyToClipboard}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          title={t.copyLink}
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
