import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2, Lock } from 'lucide-react';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  type KnowledgeCategory,
  type KnowledgeEntry,
} from '@/services/knowledgeBaseService';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { canUseFeature, numericAppSumoTier } from '@/lib/appsumoGating';

const CATEGORIES: { id: KnowledgeCategory; label: string }[] = [
  { id: 'case_study', label: 'Case study' },
  { id: 'brand_voice', label: 'Brand voice' },
  { id: 'service_package', label: 'Service package' },
];

export default function KnowledgeBase() {
  const { user } = useSession();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('case_study');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await fetchProfileByAuthId(user.id, 'appsumo_tier, appsumo_codes_count, subscription_tier, plan_type');
      const tier = numericAppSumoTier(data as Record<string, unknown>);
      setAllowed(canUseFeature(tier, 'agency_knowledge'));
      if (canUseFeature(tier, 'agency_knowledge')) {
        try {
          setEntries(await listKnowledge(user.id));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to load knowledge base');
        }
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleCreate = async () => {
    if (!user?.id || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const created = await createKnowledge(user.id, { title, content, category });
      setEntries((prev) => [created, ...prev]);
      setTitle('');
      setContent('');
      toast.success('Saved to knowledge base');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GatedAppPage
      required="pro"
      featureName="Agency Knowledge Base"
      description="Save case studies, brand voice, and service packages for batch proposals. Requires Tier 2 or higher."
    >
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agency Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Injected into B2B batch proposal prompts</p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : !allowed ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-2 text-sm text-amber-200">
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            Agency Knowledge Base requires AppSumo Tier 2 (2 stacked codes) or Pro.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      category === c.id ? 'bg-violet-500/20 border-violet-500/40 text-violet-200' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <Textarea placeholder="Content used by the prompt builder…" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[120px]" />
              <Button onClick={handleCreate} disabled={saving || !title.trim() || !content.trim()} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save entry
              </Button>
            </div>
            <div className="space-y-3">
              {entries.map((e) => (
                <div key={e.id} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{e.category.replace('_', ' ')}</p>
                      <h3 className="font-semibold">{e.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await deleteKnowledge(e.id);
                        setEntries((prev) => prev.filter((x) => x.id !== e.id));
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
              {!entries.length && (
                <p className="text-sm text-muted-foreground">No entries yet. Add a case study to improve batch pitches.</p>
              )}
            </div>
          </>
        )}
      </div>
    </GatedAppPage>
  );
}
