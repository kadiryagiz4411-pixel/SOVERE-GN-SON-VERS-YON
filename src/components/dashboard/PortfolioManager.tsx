import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FolderOpen, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
}

interface PortfolioManagerProps {
  projects: PortfolioProject[];
  onChange: (projects: PortfolioProject[]) => void;
}

const translations = {
  en: {
    title: 'Portfolio / Projects',
    subtitle: 'AI will match your best projects to each job application automatically.',
    addProject: 'Add Project',
    projectTitle: 'Project Title',
    description: 'Short Description',
    url: 'Project URL',
    tags: 'Tags (comma separated)',
    tagsHint: 'e.g. React, API, E-commerce',
    remove: 'Remove',
    empty: 'No projects yet. Add your best work to get smarter AI matches.',
  },
  tr: {
    title: 'Portföy / Projeler',
    subtitle: 'AI, her iş başvurusu için en iyi projelerinizi otomatik olarak eşleştirecek.',
    addProject: 'Proje Ekle',
    projectTitle: 'Proje Adı',
    description: 'Kısa Açıklama',
    url: 'Proje URL',
    tags: 'Etiketler (virgülle ayır)',
    tagsHint: 'ör. React, API, E-ticaret',
    remove: 'Kaldır',
    empty: 'Henüz proje yok. Daha akıllı AI eşleştirmeleri için en iyi çalışmalarınızı ekleyin.',
  },
  de: {
    title: 'Portfolio / Projekte',
    subtitle: 'KI wird Ihre besten Projekte automatisch jeder Bewerbung zuordnen.',
    addProject: 'Projekt hinzufügen',
    projectTitle: 'Projektname',
    description: 'Kurzbeschreibung',
    url: 'Projekt-URL',
    tags: 'Tags (kommagetrennt)',
    tagsHint: 'z.B. React, API, E-Commerce',
    remove: 'Entfernen',
    empty: 'Noch keine Projekte. Fügen Sie Ihre besten Arbeiten hinzu.',
  },
  fr: {
    title: 'Portfolio / Projets',
    subtitle: "L'IA associera automatiquement vos meilleurs projets à chaque candidature.",
    addProject: 'Ajouter un projet',
    projectTitle: 'Nom du projet',
    description: 'Description courte',
    url: 'URL du projet',
    tags: 'Tags (séparés par des virgules)',
    tagsHint: 'ex. React, API, E-commerce',
    remove: 'Supprimer',
    empty: 'Aucun projet. Ajoutez vos meilleurs travaux pour des correspondances IA plus intelligentes.',
  },
};

export const PortfolioManager = ({ projects, onChange }: PortfolioManagerProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [expanded, setExpanded] = useState<string | null>(null);

  const addProject = () => {
    const newProject: PortfolioProject = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      url: '',
      tags: [],
    };
    onChange([...projects, newProject]);
    setExpanded(newProject.id);
  };

  const updateProject = (id: string, field: keyof PortfolioProject, value: any) => {
    onChange(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProject = (id: string) => {
    onChange(projects.filter(p => p.id !== id));
  };

  return (
    <div className="pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          {t.title}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={addProject} className="gap-1">
          <Plus className="w-3 h-3" />
          {t.addProject}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t.subtitle}</p>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === project.id ? null : project.id)}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left flex-1"
                >
                  {project.title || t.projectTitle}
                </button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProject(project.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {(expanded === project.id || !project.title) && (
                <div className="space-y-2 mt-2">
                  <Input
                    placeholder={t.projectTitle}
                    value={project.title}
                    onChange={(e) => updateProject(project.id, 'title', e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder={t.description}
                    value={project.description}
                    onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder={t.url}
                      value={project.url}
                      onChange={(e) => updateProject(project.id, 'url', e.target.value)}
                      className="text-sm flex-1"
                    />
                    {project.url && (
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder={t.tagsHint}
                      value={project.tags.join(', ')}
                      onChange={(e) => updateProject(project.id, 'tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {expanded !== project.id && project.title && (
                <div className="flex items-center gap-2 flex-wrap">
                  {project.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                  ))}
                  {project.url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
