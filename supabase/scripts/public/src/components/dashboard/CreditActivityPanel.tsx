import { ArrowDownRight, ArrowUpRight, Coins, History, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

export interface CreditActivityItem {
  id: string;
  amount: number;
  balance_after: number;
  created_at: string;
  transaction_type: string;
  description: string | null;
  reference_type: string | null;
}

interface CreditActivityPanelProps {
  currentBalance: number;
  items: CreditActivityItem[];
}

const numberFormatter = new Intl.NumberFormat('en-US');

export const CreditActivityPanel = ({ currentBalance, items }: CreditActivityPanelProps) => {
  const { language } = useLanguage();

  const copy = {
    en: {
      title: 'Credit history',
      description: 'See recent balance changes and latest usage events.',
      balance: 'Current balance',
      added: 'Added',
      spent: 'Spent',
      recentActivity: 'Recent activity',
      empty: 'No credit activity yet.',
      balanceAfter: 'Balance after',
      noDescription: 'Credit activity',
    },
    tr: {
      title: 'Kredi geçmişi',
      description: 'Son bakiye değişimlerini ve kullanım hareketlerini gör.',
      balance: 'Mevcut bakiye',
      added: 'Eklenen',
      spent: 'Harcanan',
      recentActivity: 'Son hareketler',
      empty: 'Henüz kredi hareketi yok.',
      balanceAfter: 'İşlem sonrası bakiye',
      noDescription: 'Kredi hareketi',
    },
    de: {
      title: 'Credit-Verlauf',
      description: 'Letzte Guthabenänderungen und Nutzungsereignisse ansehen.',
      balance: 'Aktuelles Guthaben',
      added: 'Hinzugefügt',
      spent: 'Verbraucht',
      recentActivity: 'Letzte Aktivitäten',
      empty: 'Noch keine Credit-Aktivität.',
      balanceAfter: 'Guthaben danach',
      noDescription: 'Credit-Aktivität',
    },
    fr: {
      title: 'Historique des crédits',
      description: 'Consultez les derniers mouvements de solde et d’utilisation.',
      balance: 'Solde actuel',
      added: 'Ajoutés',
      spent: 'Dépensés',
      recentActivity: 'Activité récente',
      empty: 'Aucun mouvement de crédit pour le moment.',
      balanceAfter: 'Solde après action',
      noDescription: 'Mouvement de crédit',
    },
  };

  const t = copy[language as keyof typeof copy] || copy.en;
  const totalAdded = items.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = Math.abs(items.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0));

  return (
    <Card className="rounded-3xl border-border bg-card/95">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl text-foreground">{t.title}</CardTitle>
            <CardDescription className="mt-1">{t.description}</CardDescription>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <History className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.balance}</p>
            <div className="mt-3 flex items-center gap-2 text-foreground">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{numberFormatter.format(currentBalance)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.added}</p>
            <div className="mt-3 flex items-center gap-2 text-foreground">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{numberFormatter.format(totalAdded)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.spent}</p>
            <div className="mt-3 flex items-center gap-2 text-foreground">
              <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{numberFormatter.format(totalSpent)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{t.recentActivity}</p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
              {t.empty}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const positive = item.amount > 0;
                const formattedDate = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(item.created_at));

                return (
                  <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {item.description || t.noDescription}
                        </span>
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {item.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formattedDate}</span>
                        <span>{t.balanceAfter}: {numberFormatter.format(item.balance_after)}</span>
                        {item.reference_type && <span>{item.reference_type}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${positive ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'}`}>
                        {positive ? '+' : ''}{numberFormatter.format(item.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};