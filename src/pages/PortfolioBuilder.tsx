import { useMemo, useState } from 'react';
import { Download, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { useSession } from '@/contexts/SessionContext';
import { useProfile } from '@/hooks/useProfile';

function buildPortfolioHtml(data: {
  name: string;
  title: string;
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  email: string;
  linkedin: string;
  github: string;
}): string {
  const skills = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.name} — Portfolio</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Inter, system-ui, sans-serif; background:#09090b; color:#e4e4e7; }
    .wrap { max-width: 880px; margin: 0 auto; padding: 48px 20px; }
    h1 { font-size: 2.4rem; margin: 0; }
    .title { color:#fbbf24; margin-top:6px; }
    .muted { color:#a1a1aa; }
    .card { background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px; margin-top:18px; }
    .pills { display:flex; flex-wrap:wrap; gap:8px; }
    .pill { border:1px solid #f59e0b55; color:#fbbf24; border-radius:999px; padding:4px 10px; font-size:12px; }
    a { color:#fbbf24; }
    pre { white-space: pre-wrap; font-family: inherit; margin:0; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${data.name || 'Your Name'}</h1>
    <p class="title">${data.title || 'Professional'}</p>
    <p class="muted">${data.email} ${data.linkedin ? '· ' + data.linkedin : ''} ${data.github ? '· ' + data.github : ''}</p>
    <div class="card"><h3>About</h3><p>${data.summary || ''}</p></div>
    <div class="card"><h3>Skills</h3><div class="pills">${skills.map((s) => `<span class="pill">${s}</span>`).join('')}</div></div>
    <div class="card"><h3>Experience</h3><pre>${data.experience || ''}</pre></div>
    <div class="card"><h3>Projects</h3><pre>${data.projects || ''}</pre></div>
  </div>
</body>
</html>`;
}

export default function PortfolioBuilder() {
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

  const html = useMemo(
    () => buildPortfolioHtml({ name, title, summary, skills, experience, projects, email, linkedin, github }),
    [name, title, summary, skills, experience, projects, email, linkedin, github],
  );

  const download = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'portfolio').replace(/\s+/g, '-').toLowerCase()}-portfolio.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <GatedAppPage
      required="elite"
      featureName="Portfolio Website Builder"
      description="Live HTML portfolio export is locked to Elite and above."
    >
      <div className="p-6 max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold">Portfolio Builder</h1>
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline / role" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="LinkedIn URL" />
          <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL" />
          <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma separated)" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary" className="min-h-[90px]" />
          <Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience" className="min-h-[120px]" />
          <Textarea value={projects} onChange={(e) => setProjects(e.target.value)} placeholder="Projects" className="min-h-[90px]" />
          <Button type="button" onClick={download}>
            <Download className="w-4 h-4 mr-2" /> Download .html
          </Button>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden min-h-[640px] bg-black">
          <iframe title="Portfolio preview" className="w-full h-full min-h-[640px] border-0" srcDoc={html} />
        </div>
      </div>
    </GatedAppPage>
  );
}
