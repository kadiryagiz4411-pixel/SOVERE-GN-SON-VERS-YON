import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { MobileBottomNav, SwipeablePageWrapper } from '@/components/MobileBottomNav';
import {
  Crown, ArrowLeft, Plus, Loader2, GripVertical, ExternalLink,
  Trash2, ChevronDown, ChevronUp, Send, Eye, MessageCircle, Trophy, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

interface Application {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  job_url: string;
  job_description: string;
  generated_proposal: string;
  status: string;
  acceptance_score: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

const COLUMNS = [
  { id: 'applied', label: '📨 Applied', color: 'border-blue-500/30 bg-blue-500/5' },
  { id: 'awaiting', label: '⏳ Awaiting', color: 'border-amber-500/30 bg-amber-500/5' },
  { id: 'interview', label: '🎯 Interview', color: 'border-purple-500/30 bg-purple-500/5' },
  { id: 'won', label: '🏆 Won', color: 'border-green-500/30 bg-green-500/5' },
  { id: 'lost', label: '❌ Lost', color: 'border-destructive/30 bg-destructive/5' },
];

const translations = {
  en: {
    title: 'Application Pipeline',
    subtitle: 'Track your applications from submission to success',
    addNew: 'Add Application',
    empty: 'No applications yet',
    emptyHint: 'Generate a proposal, then save it here',
    jobTitle: 'Job Title',
    company: 'Company',
    jobUrl: 'Job URL',
    notes: 'Notes',
    save: 'Save',
    cancel: 'Cancel',
    viewProposal: 'View Proposal',
    moveToApplied: 'Applied',
    moveToAwaiting: 'Awaiting',
    moveToInterview: 'Interview',
    moveToWon: 'Won',
    moveToLost: 'Lost',
  },
  tr: {
    title: 'Başvuru Pipeline',
    subtitle: 'Başvurularınızı gönderimden başarıya kadar takip edin',
    addNew: 'Başvuru Ekle',
    empty: 'Henüz başvuru yok',
    emptyHint: 'Bir teklif oluşturun, sonra buraya kaydedin',
    jobTitle: 'İş Başlığı',
    company: 'Şirket',
    jobUrl: 'İş URL',
    notes: 'Notlar',
    save: 'Kaydet',
    cancel: 'İptal',
    viewProposal: 'Teklifi Gör',
    moveToApplied: 'Başvuruldu',
    moveToAwaiting: 'Beklemede',
    moveToInterview: 'Mülakat',
    moveToWon: 'Kazanıldı',
    moveToLost: 'Kaybedildi',
  },
  de: {
    title: 'Bewerbungs-Pipeline',
    subtitle: 'Verfolgen Sie Ihre Bewerbungen von der Einreichung bis zum Erfolg',
    addNew: 'Bewerbung hinzufügen',
    empty: 'Noch keine Bewerbungen',
    emptyHint: 'Erstellen Sie einen Vorschlag und speichern Sie ihn hier',
    jobTitle: 'Stellenbezeichnung',
    company: 'Unternehmen',
    jobUrl: 'Stellen-URL',
    notes: 'Notizen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    viewProposal: 'Vorschlag ansehen',
    moveToApplied: 'Beworben',
    moveToAwaiting: 'Wartend',
    moveToInterview: 'Interview',
    moveToWon: 'Gewonnen',
    moveToLost: 'Verloren',
  },
  fr: {
    title: 'Pipeline de candidatures',
    subtitle: 'Suivez vos candidatures de la soumission au succès',
    addNew: 'Ajouter une candidature',
    empty: 'Aucune candidature encore',
    emptyHint: 'Générez une proposition, puis enregistrez-la ici',
    jobTitle: 'Titre du poste',
    company: 'Entreprise',
    jobUrl: 'URL du poste',
    notes: 'Notes',
    save: 'Enregistrer',
    cancel: 'Annuler',
    viewProposal: 'Voir la proposition',
    moveToApplied: 'Candidaté',
    moveToAwaiting: 'En attente',
    moveToInterview: 'Entretien',
    moveToWon: 'Gagné',
    moveToLost: 'Perdu',
  },
};

const ApplicationPipeline = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language] || translations.en;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [newApp, setNewApp] = useState({ job_title: '', company: '', job_url: '', notes: '' });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }
      setUser(session.user);
      await fetchApplications(session.user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchApplications = async (userId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setApplications(data as Application[]);
  };

  const handleAdd = async () => {
    if (!user || !newApp.job_title.trim()) return;
    const { error } = await supabase.from('applications').insert({
      user_id: user.id,
      job_title: newApp.job_title,
      company: newApp.company,
      job_url: newApp.job_url,
      notes: newApp.notes,
      status: 'applied',
    });
    if (error) { toast.error('Failed to add'); return; }
    toast.success('Application added!');
    setNewApp({ job_title: '', company: '', job_url: '', notes: '' });
    setShowAddForm(false);
    await fetchApplications(user.id);
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId);
    if (error) { toast.error('Failed to update'); return; }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    toast.success(`Moved to ${newStatus}`);
  };

  const handleDelete = async (appId: string) => {
    const { error } = await supabase.from('applications').delete().eq('id', appId);
    if (error) { toast.error('Failed to delete'); return; }
    setApplications(prev => prev.filter(a => a.id !== appId));
    toast.success('Deleted');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getColumnApps = (status: string) => applications.filter(a => a.status === status);

  return (
    <SwipeablePageWrapper>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">{t.title}</span>
              </div>
            </div>
            <Button variant="gold" size="sm" onClick={() => setShowAddForm(true)} className="gap-1">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.addNew}</span>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
          <p className="text-sm text-muted-foreground text-center mb-6">{t.subtitle}</p>

          {/* Add Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{t.addNew}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <Input placeholder={t.jobTitle} value={newApp.job_title} onChange={(e) => setNewApp({ ...newApp, job_title: e.target.value })} />
                  <Input placeholder={t.company} value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} />
                  <Input placeholder={t.jobUrl} value={newApp.job_url} onChange={(e) => setNewApp({ ...newApp, job_url: e.target.value })} />
                  <Input placeholder={t.notes} value={newApp.notes} onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })} />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">{t.cancel}</Button>
                    <Button variant="gold" onClick={handleAdd} className="flex-1">{t.save}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kanban Board - horizontal scroll on mobile */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {COLUMNS.map((col) => {
              const colApps = getColumnApps(col.id);
              return (
                <div key={col.id} className={`min-w-[260px] sm:min-w-[220px] flex-1 rounded-xl border ${col.color} p-3 snap-start`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{colApps.length}</span>
                  </div>

                  {colApps.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">{t.empty}</p>
                  ) : (
                    <div className="space-y-2">
                      {colApps.map((app) => (
                        <div key={app.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{app.job_title}</p>
                              {app.company && <p className="text-xs text-muted-foreground truncate">{app.company}</p>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleDelete(app.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Expanded content */}
                          {expandedCard === app.id && (
                            <div className="mt-2 pt-2 border-t border-border space-y-2">
                              {app.generated_proposal && (
                                <div className="text-xs text-foreground bg-muted/50 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">
                                  {app.generated_proposal.slice(0, 300)}...
                                </div>
                              )}
                              {app.job_url && (
                                <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                                  <ExternalLink className="w-3 h-3" /> {language === 'tr' ? 'İlanı aç' : 'Open job'}
                                </a>
                              )}
                              {app.notes && <p className="text-xs text-muted-foreground">{app.notes}</p>}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-2 flex items-center justify-between">
                            <button
                              onClick={() => setExpandedCard(expandedCard === app.id ? null : app.id)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              {expandedCard === app.id ? (language === 'tr' ? 'Kapat' : 'Close') : (language === 'tr' ? 'Detay' : 'Details')}
                            </button>
                            <div className="flex gap-0.5">
                              {COLUMNS.filter(c => c.id !== col.id).map((target) => (
                                <button
                                  key={target.id}
                                  onClick={() => handleStatusChange(app.id, target.id)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title={target.label}
                                >
                                  {target.label.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </SwipeablePageWrapper>
  );
};

export default ApplicationPipeline;
