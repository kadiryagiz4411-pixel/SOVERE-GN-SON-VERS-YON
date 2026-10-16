/**
 * B2B Command Center — activity timeline, search, memory bank.
 * Route: /dashboard/command-center
 */

import { useEffect, useState } from 'react';
import { LayoutDashboard, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/contexts/SessionContext';
import {
  fetchActivities,
  fetchMemoryBank,
  upsertMemoryCard,
  deleteMemoryCard,
  type CommandActivity,
  type MemoryCard,
  type MemoryCategory,
} from '@/lib/memory/activityLogger';
import { sanitizeAiText } from '@/lib/ai/sanitizer';

const CATS: MemoryCategory[] = ['TECH_STACK', 'PAST_HIRING_WIN', 'PROPOSAL_PATTERN', 'COMPANY_CULTURE'];

export default function CommandCenter() {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [activities, setActivities] = useState<CommandActivity[]>([]);
  const [memory, setMemory] = useState<MemoryCard[]>([]);
  const [draftCat, setDraftCat] = useState<MemoryCategory>('TECH_STACK');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const reload = async () => {
    if (!user?.id) return;
    const [acts, mem] = await Promise.all([
      fetchActivities(user.id, query),
      fetchMemoryBank(user.id),
    ]);
    setActivities(acts);
    setMemory(mem);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, query]);

  const saveCard = async () => {
    if (!user?.id || !draftTitle.trim() || !draftBody.trim()) return;
    try {
      await upsertMemoryCard({
        userId: user.id,
        category: draftCat,
        keyTitle: draftTitle.trim(),
        memoryContent: sanitizeAiText(draftBody.trim()),
      });
      setDraftTitle('');
      setDraftBody('');
      toast.success('Memory saved');
      void reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <GatedAppPage
      required="enterprise"
      featureName="B2B Command Center"
      description="Every parse, evaluation, proposal, and share is logged here."
    >
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Enterprise</p>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
              <LayoutDashboard className="w-6 h-6 text-amber-400" /> Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search history, audit activity, and edit the memory the AI actually uses.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search candidates, proposals, share links, rationale…"
              className="pl-9"
            />
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold">Activity timeline</h2>
            <div className="rounded-2xl border border-border divide-y divide-border bg-card">
              {activities.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">No activity yet. Parse a file in Evaluator, Analyzer, or Proposals.</p>
              )}
              {activities.map(a => (
                <div key={a.id} className="px-4 py-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-primary">{a.activityType.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-medium">{a.entityName}</p>
                    {a.summary && <p className="text-xs text-muted-foreground">{sanitizeAiText(a.summary)}</p>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Memory bank</h2>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {CATS.map(c => (
                  <button
                    key={c}
                    onClick={() => setDraftCat(c)}
                    className={`text-[11px] px-2 py-1 rounded-lg border ${draftCat === c ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {c.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Title (e.g. React + Node stack)" />
              <Textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Memory the AI should use…" className="min-h-[80px]" />
              <Button size="sm" variant="gold" className="gap-1" onClick={() => void saveCard()}>
                <Plus className="w-3.5 h-3.5" /> Save memory
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memory.map(card => (
                <div key={card.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{card.category.replace(/_/g, ' ')}</p>
                      <p className="font-semibold text-sm">{card.keyTitle}</p>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => { void deleteMemoryCard(card.id).then(() => reload()); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground/80">{sanitizeAiText(card.memoryContent)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </GatedAppPage>
  );
}
