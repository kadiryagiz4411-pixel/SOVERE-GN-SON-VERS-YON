import { useMemo, useState } from 'react';
import { Download, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/contexts/SessionContext';
import { useProfile } from '@/hooks/useProfile';
import {
  PORTFOLIO_THEMES,
  buildInlinePreview,
  downloadPortfolioZip,
  type PortfolioTheme,
} from '@/lib/portfolioExport';

export function PortfolioBuilderPanel() {
  const { user } = useSession();
  const { profile } = useProfile(user);
  const [name, setName] = useState(profile?.full_name || '');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState(profile?.bio || '');
  const [skills, setSkills] = useState((profile?.skills ?? []).join(', '));
  const [experience, setExperience] = useState(profile?.experience || '');
  const [projects, setProjects] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [theme, setTheme] = useState<PortfolioTheme>('midnight');

  const data = { name, title, summary, skills, experience, projects, email, linkedin, github, theme };
  const html = useMemo(() => buildInlinePreview(data), [name, title, summary, skills, experience, projects, email, linkedin, github, theme]);

  return (
    <div className="p-6 max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-400" />
          <h1 className="text-2xl font-bold">Portfolio Builder</h1>
        </div>
        <div className="flex gap-2">
          {(Object.keys(PORTFOLIO_THEMES) as PortfolioTheme[]).map((key) => (
            <Button key={key} type="button" size="sm" variant={theme === key ? 'default' : 'outline'} onClick={() => setTheme(key)}>
              {PORTFOLIO_THEMES[key].label}
            </Button>
          ))}
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline / role" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="LinkedIn URL" />
        <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL" />
        <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Tech stack (comma separated)" />
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary" className="min-h-[90px]" />
        <Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience" className="min-h-[120px]" />
        <Textarea value={projects} onChange={(e) => setProjects(e.target.value)} placeholder="Projects" className="min-h-[90px]" />
        <Button type="button" onClick={() => void downloadPortfolioZip(data)}>
          <Download className="w-4 h-4 mr-2" /> Download HTML/CSS Zip
        </Button>
      </div>
      <div className="rounded-2xl border border-border overflow-hidden min-h-[640px] bg-black">
        <iframe title="Portfolio preview" className="w-full h-full min-h-[640px] border-0" srcDoc={html} />
      </div>
    </div>
  );
}
