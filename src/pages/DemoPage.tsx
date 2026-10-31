import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  extractRequiredSkills,
  matchBand,
  scoreOpportunity,
  type MatchResult,
} from '@/lib/matchScore';
import { APPSUMO_LTD_TIERS } from '@/config/appsumo';
import { ArrowRight, Check, PanelRight, ScanLine, Sparkles, Ticket } from 'lucide-react';

const UPWORK_SCREEN = {
  title: 'Upwork · React dashboard for a fintech client',
  body: 'Payment verified. React, TypeScript, Tailwind, and Node. First milestone is a readable portfolio view.',
};

const TIER_LINE: Record<number, string> = {
  1: 'Freelancers & Job Seekers',
  2: 'Power Users & Match Scoring',
  3: 'Full Lead Extraction & Bulk Pitch',
};

function demoTourUrl() {
  const raw = String(import.meta.env.VITE_DEMO_TOUR_URL ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

const SAMPLE_JOB = `Senior React engineer — fintech dashboard

We need a freelancer to rebuild our client dashboard.
Stack: React, TypeScript, Tailwind, Node, and Supabase.
The first milestone is a readable portfolio view with live balances.
Please show similar dashboard work and a plan for the first week.`;

const SAMPLE_PROFILE = `Independent product engineer, 6 years.
Daily stack: React, TypeScript, Tailwind, and Node.
Shipped SaaS dashboards for two fintech teams.
Comfortable leading a first-week slice and writing the client update.`;

const MOCK_SCAN_JOB = 'React TypeScript dashboard. Tailwind, Node, and a clear first-week milestone.';
const MOCK_SCAN_PROFILE = 'React, TypeScript, Tailwind, Node. SaaS dashboards.';

const SAMPLE_LEADS = [
  { company: 'Northwind Analytics', note: 'Series B · hiring a product engineer for the reporting suite' },
  { company: 'Harbor Freight Ops', note: 'Logistics team · dashboard rewrite, React and TypeScript' },
  { company: 'Lumen Clinic', note: 'Patient portal · wants a first-week prototype, not a six-month plan' },
];

const SAMPLE_RESUME = `Aylin Demir
Product engineer, 6 years
Daily stack: React, TypeScript, Tailwind, Node, and Supabase.
Shipped SaaS dashboards for two fintech teams.
Comfortable leading a first-week slice and writing the client update.`;

const SAMPLE_DRAFT = `Hello, I am excited to apply for this role.
I have experience with many technologies and I am a hard worker.
I would love to discuss this opportunity.`;

type DemoBlock = 'candidate' | 'proposal';

const LOAD_STEPS: Record<DemoBlock, string[]> = {
  candidate: ['Reading the resume…', 'Matching skills…', 'Writing gaps and a score…'],
  proposal: ['Reading the brief…', 'Tuning the cover letter…', 'Writing opening hooks…'],
};

function firstLine(text: string, fallback: string) {
  const line = text.split('\n').map((part) => part.trim()).find(Boolean) || fallback;
  return line.replace(/^#+\s*/, '').slice(0, 88);
}

function scoreTexts(jobText: string, profileText: string) {
  const skills = extractRequiredSkills(profileText);
  return scoreOpportunity(
    { skills, experience: profileText },
    firstLine(jobText, 'this brief'),
    jobText,
  );
}

function buildSandboxProposal(jobText: string, profileText: string, result: MatchResult) {
  const title = firstLine(jobText, 'this project');
  const matched = result.matchedSkills.slice(0, 4);
  const missing = result.missingSkills[0];
  const proof = matched.length
    ? `The overlap I would lead with is ${matched.join(', ')}.`
    : 'I would open with one concrete first-week result instead of a biography.';
  const gap = missing
    ? `The brief also asks for ${missing}. I would cover that with a small proof in week one, not a vague promise.`
    : 'The keyword overlap is already tight, so the opening should stay short and specific.';
  const profileHint = profileText.trim()
    ? 'The profile you pasted is the only source for the proof below.'
    : 'Paste a short profile and the next run will use those skills in the opening.';

  return [
    `Hello — I read the brief for ${title}.`,
    '',
    profileHint,
    proof,
    '',
    gap,
    '',
    'How I would start:',
    '1. Restate the outcome in one sentence and confirm the constraint that matters.',
    '2. Ship a narrow first slice you can review within a few days.',
    '3. Leave a short note on the next decision, so the follow-up is easy.',
    '',
    'If that matches how you like to work, I can start from the most urgent part of the brief.',
    '',
    'Sandbox preview. Nothing is saved, and this run does not use account credits.',
  ].join('\n');
}

function detectDemoLanguage(text: string): 'tr' | 'en' {
  const sample = text.replace(/\s+/g, ' ').slice(0, 2000);
  const turkishMarks = (sample.match(/[ğüşıöçĞÜŞİÖÇ]/g) || []).length;
  const turkishWords = (sample.match(/\b(ve|bir|için|ile|olan|değil)\b/gi) || []).length;
  return turkishMarks + turkishWords >= 2 ? 'tr' : 'en';
}

function buildHooks(jobText: string, result: MatchResult, language: 'tr' | 'en') {
  const title = firstLine(jobText, language === 'tr' ? 'bu iş' : 'this brief');
  const skill = result.matchedSkills[0] || (language === 'tr' ? 'ilk teslim' : 'the first slice');
  if (language === 'tr') {
    return [
      `${title} için ilk haftada çalışan bir ekran bırakırım.`,
      `${skill} ile başlarım; genel bir özgeçmişle değil.`,
      'Karar vermeniz için kısa bir notla kapatırım.',
    ];
  }
  return [
    `I can leave a working screen for ${title} in the first week.`,
    `I would start from ${skill}, not from a general biography.`,
    'I will close with the one decision you need to make next.',
  ];
}

function recommendationsFor(result: MatchResult | null) {
  if (!result) return ['Paste a job description, then score it. One skill is enough.'];
  const lines = result.missingSkills.slice(0, 4).map(
    (skill) => `Mention ${skill} with one result you have already shipped.`,
  );
  if (!lines.length) {
    lines.push('Lead with the overlap you already have. Keep the first paragraph under five lines.');
  }
  lines.push(result.narrative || `${result.matchScore}% fit from keyword overlap.`);
  return lines;
}

function ScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div
      className="relative h-40 w-40 shrink-0"
      role="img"
      aria-label={score == null ? 'Match score not calculated yet' : `${score} percent match`}
    >
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="rgb(39 39 42)" strokeWidth="10" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#f59e0b"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score == null ? circumference : offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-zinc-50">
          {score == null ? '—' : `${score}%`}
        </span>
        <span className="text-sm text-zinc-400">Match</span>
      </div>
    </div>
  );
}

const DemoPage = () => {
  const [candidateJob, setCandidateJob] = useState('');
  const [proposalJob, setProposalJob] = useState('');
  const [profileText, setProfileText] = useState('');
  const [proposalDraft, setProposalDraft] = useState('');
  const [block, setBlock] = useState<DemoBlock>('candidate');
  const [runningBlock, setRunningBlock] = useState<DemoBlock | null>(null);
  const [loadLabel, setLoadLabel] = useState('');
  const [candidateNote, setCandidateNote] = useState('');
  const [proposalNote, setProposalNote] = useState('');
  const [candidateResult, setCandidateResult] = useState<MatchResult | null>(null);
  const [proposal, setProposal] = useState('');
  const [hooks, setHooks] = useState<string[]>([]);
  const [candidateLanguage, setCandidateLanguage] = useState<'tr' | 'en'>('en');
  const [proposalLanguage, setProposalLanguage] = useState<'tr' | 'en'>('en');
  const [streaming, setStreaming] = useState(false);
  const [proposalScore, setProposalScore] = useState<number | null>(null);
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [scanMatch, setScanMatch] = useState<MatchResult | null>(null);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [leadPhase, setLeadPhase] = useState<'idle' | 'extracting' | 'done'>('idle');
  const streamSeq = useRef(0);
  const timers = useRef<number[]>([]);
  const proposalRef = useRef<HTMLElement>(null);
  const extensionRef = useRef<HTMLElement>(null);
  const [screenTitle, setScreenTitle] = useState('Fintech dashboard rebuild');
  const [screenBody, setScreenBody] = useState(MOCK_SCAN_JOB);
  const tourUrl = demoTourUrl();

  useEffect(() => {
    document.title = 'Live Demo · Sovereign';
    const pending = timers.current;
    return () => {
      streamSeq.current += 1;
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const loadSample = () => {
    if (block === 'candidate') {
      setProfileText(SAMPLE_RESUME);
      setCandidateJob(SAMPLE_JOB);
      setCandidateNote('Sample resume loaded into Candidate analysis.');
      return;
    }
    setProposalJob(SAMPLE_JOB);
    setProposalDraft(SAMPLE_DRAFT);
    setProposalNote('Sample brief and draft loaded into Proposal optimization.');
  };

  const readDroppedFile = async (file: File) => {
    const name = file.name || 'file';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const note = block === 'candidate' ? setCandidateNote : setProposalNote;
    if (ext === 'pdf' || file.type === 'application/pdf') {
      note('This demo reads TXT and HTML in the browser. Paste PDF text, or drop a TXT or HTML file.');
      return;
    }
    if (ext !== 'txt' && ext !== 'html' && ext !== 'htm' && !file.type.startsWith('text/')) {
      note('Use a TXT or HTML file.');
      return;
    }
    const raw = await file.text();
    const text = ext === 'html' || ext === 'htm' || file.type === 'text/html'
      ? new DOMParser().parseFromString(raw, 'text/html').body?.innerText?.replace(/\s+/g, ' ').trim() || ''
      : raw.trim();
    if (text.length < 20) {
      note('That file is too short to preview.');
      return;
    }
    const clipped = text.slice(0, 4000);
    if (block === 'candidate') setProfileText(clipped);
    else setProposalDraft(clipped);
    note(`${name} is in ${block === 'candidate' ? 'Candidate analysis' : 'Proposal optimization'} only.`);
  };

  const runSandbox = async (overrides?: { block?: DemoBlock; job?: string; profile?: string; draft?: string }) => {
    const nextBlock = overrides?.block || block;
    const nextJob = overrides?.job ?? (nextBlock === 'candidate' ? candidateJob : proposalJob);
    const nextProfile = overrides?.profile ?? profileText;
    const nextDraft = overrides?.draft ?? proposalDraft;
    const source = nextBlock === 'candidate' ? nextProfile : `${nextJob}\n${nextDraft}`;
    if (source.trim().length < 20 || (nextBlock === 'proposal' && nextJob.trim().length < 20)) {
      (nextBlock === 'candidate' ? setCandidateNote : setProposalNote)(nextBlock === 'candidate'
        ? 'Load a sample resume or paste one before scoring.'
        : 'Load a sample brief or paste a job before tuning.');
      return;
    }
    const seq = ++streamSeq.current;
    const steps = LOAD_STEPS[nextBlock];
    setRunningBlock(nextBlock);
    setStreaming(true);
    for (const step of steps) {
      if (streamSeq.current !== seq) return;
      setLoadLabel(step);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    if (streamSeq.current !== seq) return;
    const language = detectDemoLanguage(`${nextJob}\n${nextBlock === 'candidate' ? nextProfile : nextDraft}`);
    const result = scoreTexts(
      nextJob || SAMPLE_JOB,
      nextBlock === 'candidate' ? nextProfile : (nextDraft || nextProfile),
    );
    if (nextBlock === 'candidate') setCandidateLanguage(language);
    else setProposalLanguage(language);
    if (nextBlock === 'candidate') {
      setCandidateResult(result);
    } else {
      setProposalScore(result.matchScore);
      setHooks(buildHooks(nextJob, result, language));
      const full = language === 'tr'
        ? [
          `${firstLine(nextJob, 'bu iş')} için ilk haftada dar bir teslim bırakırım.`,
          result.matchedSkills.length
            ? `Öne çıkaracağım örtüşme: ${result.matchedSkills.slice(0, 3).join(', ')}.`
            : 'İlk paragrafta genel bir özgeçmiş yerine somut bir sonuç yazarım.',
          'Sandbox önizlemesi. Hesaba kaydedilmez ve kredi harcamaz.',
        ].join('\n\n')
        : buildSandboxProposal(nextJob, nextDraft || nextProfile, result);
      setProposal(full);
    }
    setRunningBlock(null);
    setStreaming(false);
    setLoadLabel('');
  };

  const scanScreen = (jobBody = screenBody) => {
    if (scanPhase === 'scanning') return;
    setScanPhase('scanning');
    setScanMatch(null);
    later(() => {
      setScanMatch(scoreTexts(jobBody, MOCK_SCAN_PROFILE));
      setScanPhase('done');
    }, 2200);
  };

  const scrollToSection = (node: HTMLElement | null) => {
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const testUpworkScan = () => {
    setScreenTitle(UPWORK_SCREEN.title);
    setScreenBody(UPWORK_SCREEN.body);
    scrollToSection(extensionRef.current);
    scanScreen(UPWORK_SCREEN.body);
  };

  const jumpToProposal = () => {
    const job = proposalJob.trim() ? proposalJob : SAMPLE_JOB;
    const draft = proposalDraft.trim() ? proposalDraft : SAMPLE_DRAFT;
    setBlock('proposal');
    setProposalJob(job);
    setProposalDraft(draft);
    scrollToSection(proposalRef.current);
    void runSandbox({ block: 'proposal', job, draft });
  };

  const jumpToLeads = () => {
    scrollToSection(extensionRef.current);
    extractLeads();
  };

  const extractLeads = () => {
    if (leadPhase === 'extracting') return;
    setB2bOpen(true);
    setLeadPhase('extracting');
    later(() => setLeadPhase('done'), 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <section className="mb-10">
            <p className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-200">
              No Login Required • Test Sovereign Live in 10 Seconds
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl md:text-5xl font-semibold tracking-tight text-zinc-50 leading-tight">
              Turn Any Job Board or Screen Into High-Converting Proposals Instantly.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-300">
              Built for indie hackers, agency owners, and lifetime-deal buyers. The sandbox below runs in this browser. Nothing is saved, and no credits are spent.
            </p>
          </section>

          <section className="mb-8" aria-label="Interactive product tour">
            <div className="rounded-2xl p-px bg-gradient-to-br from-amber-300/80 via-amber-500/20 to-violet-400/50 shadow-[0_0_56px_rgba(245,158,11,0.28)]">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-950">
                {tourUrl ? (
                  <iframe
                    src={tourUrl}
                    title="Sovereign interactive product tour"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="fullscreen; autoplay"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col">
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                      <span className="ml-2 text-sm text-zinc-400">Live product tour</span>
                    </div>
                    <div className="grid flex-1 md:grid-cols-[1.4fr_0.8fr]">
                      <div className="p-6 md:p-8">
                        <p className="text-sm uppercase tracking-[0.16em] text-amber-300/90">Job board on screen</p>
                        <p className="mt-3 text-xl md:text-2xl font-semibold text-zinc-50 leading-snug">{UPWORK_SCREEN.title}</p>
                        <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-300">{UPWORK_SCREEN.body}</p>
                      </div>
                      <div className="border-t md:border-t-0 md:border-l border-white/10 bg-zinc-900/80 p-6">
                        <p className="text-sm font-semibold text-amber-200">Sovereign</p>
                        <p className="mt-2 text-base leading-relaxed text-zinc-300">Scan the listing, write the proposal, or pull agency leads. Each pill below starts that step.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={testUpworkScan} className="rounded-full border border-amber-400/40 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-amber-100 hover:border-amber-300">
                Test Upwork Scan
              </button>
              <button type="button" onClick={jumpToProposal} className="rounded-full border border-amber-400/40 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-amber-100 hover:border-amber-300">
                Generate AI Proposal
              </button>
              <button type="button" onClick={jumpToLeads} className="rounded-full border border-amber-400/40 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-amber-100 hover:border-amber-300">
                Try B2B Lead Extractor
              </button>
            </div>
          </section>

          <section id="demo-proposal" ref={proposalRef} className="scroll-mt-32 rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 md:p-8 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-300 mt-1 shrink-0" />
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-50">Interactive sandbox</h2>
                  <p className="mt-1 text-base leading-relaxed text-zinc-300">
                    No account. Load a sample, switch blocks, and read a structured preview. Nothing is saved.
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" className="border-amber-400/40 text-amber-100" onClick={loadSample}>
                Load Sample Data
              </Button>
            </div>
            <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-zinc-950 p-1" role="tablist" aria-label="Analysis block">
              <button
                type="button"
                role="tab"
                aria-selected={block === 'candidate'}
                onClick={() => setBlock('candidate')}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${block === 'candidate' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-300'}`}
              >
                Candidate Analysis
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={block === 'proposal'}
                onClick={() => setBlock('proposal')}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${block === 'proposal' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-300'}`}
              >
                Proposal Optimization
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <div
                className="rounded-xl border border-dashed border-amber-400/40 bg-zinc-950/80 p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) void readDroppedFile(file);
                }}
              >
                <p className="text-sm font-medium text-amber-200">Files for this block</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Drop a TXT or HTML file. It fills only the {block === 'candidate' ? 'candidate' : 'proposal'} tab.
                </p>
                <label className="mt-3 inline-block text-sm text-amber-100 underline cursor-pointer">
                  Choose file
                  <input
                    type="file"
                    accept=".txt,.html,.htm,.pdf,text/plain,text/html,application/pdf"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void readDroppedFile(file);
                    }}
                  />
                </label>
                {(block === 'candidate' ? candidateNote : proposalNote) && (
                  <p className="mt-3 text-sm text-zinc-300">{block === 'candidate' ? candidateNote : proposalNote}</p>
                )}
              </div>
              <div>
                {block === 'candidate' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm text-zinc-200">
                      Resume
                      <textarea value={profileText} onChange={(event) => setProfileText(event.target.value)} rows={8} placeholder="Paste a resume, or load the sample." className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60" />
                    </label>
                    <label className="block text-sm text-zinc-200">
                      Job to match
                      <textarea value={candidateJob} onChange={(event) => setCandidateJob(event.target.value)} rows={8} placeholder="Paste the role this candidate is being scored against." className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60" />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm text-zinc-200">
                      Job brief
                      <textarea value={proposalJob} onChange={(event) => setProposalJob(event.target.value)} rows={8} placeholder="Paste the client job." className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60" />
                    </label>
                    <label className="block text-sm text-zinc-200">
                      Draft to tune
                      <textarea value={proposalDraft} onChange={(event) => setProposalDraft(event.target.value)} rows={8} placeholder="Paste a rough cover letter, or load the sample." className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60" />
                    </label>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="gold" className="text-base px-5" disabled={streaming} onClick={() => { void runSandbox(); }}>
                    {streaming ? loadLabel || 'Working…' : block === 'candidate' ? 'Score candidate' : 'Tune proposal'}
                  </Button>
                  <span className="text-sm text-zinc-400" aria-live="polite">
                    {runningBlock === block ? loadLabel : 'Local preview. No sign-in and no credits.'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/70 p-5" aria-live="polite">
              {runningBlock === block && (
                <p className="text-base text-amber-200">{loadLabel}</p>
              )}
              {runningBlock !== block && block === 'candidate' && !candidateResult && (
                <p className="text-base text-zinc-400">Candidate score, skill match, gaps, and recommendations appear here.</p>
              )}
              {runningBlock !== block && block === 'proposal' && !proposal && (
                <p className="text-base text-zinc-400">Opening hooks and the tuned cover letter appear here.</p>
              )}
              {runningBlock !== block && block === 'candidate' && candidateResult && (
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <ScoreRing score={candidateResult.matchScore} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-medium text-zinc-50">{candidateResult.matchScore}% · {matchBand(candidateResult.matchScore)}</p>
                    <p className="mt-2 text-sm text-zinc-400">Output language: {candidateLanguage === 'tr' ? 'Turkish' : 'English'}</p>
                    <p className="mt-3 text-base text-zinc-200">Skill match: {candidateResult.matchedSkills.join(', ') || 'none yet'}</p>
                    <p className="mt-2 text-base text-amber-200">Gaps: {candidateResult.missingSkills.join(', ') || 'none listed'}</p>
                    <ul className="mt-4 space-y-2">
                      {recommendationsFor(candidateResult).map((line) => (
                        <li key={line} className="text-base text-zinc-200">{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {runningBlock !== block && block === 'proposal' && proposal && (
                <div>
                  <p className="text-sm text-zinc-400">Output language: {proposalLanguage === 'tr' ? 'Turkish' : 'English'}{proposalScore != null ? ` · ${proposalScore}% overlap` : ''}</p>
                  <p className="mt-3 text-sm font-medium uppercase tracking-wide text-amber-200">Opening hooks</p>
                  <ul className="mt-2 space-y-2">
                    {hooks.map((hook) => (
                      <li key={hook} className="text-base text-zinc-100">{hook}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm font-medium uppercase tracking-wide text-amber-200">Cover letter</p>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-100">{proposal}</p>
                </div>
              )}
            </div>
          </section>

          <section id="demo-extension" ref={extensionRef} className="scroll-mt-32 mt-8 rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 md:p-8">
            <div className="flex items-start gap-3 mb-6">
              <PanelRight className="w-5 h-5 text-amber-300 mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">Extension and B2B preview</h2>
                <p className="mt-1 text-base leading-relaxed text-zinc-300">
                  A visual mock of the side panel. Scan Active Screen and Lead Extraction run only when you click them.
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 min-h-[520px]">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="ml-3 text-sm text-zinc-500">upwork.com/jobs/fintech-dashboard</span>
              </div>
              <div className="grid lg:grid-cols-[1fr_260px] min-h-[460px]">
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-zinc-800 min-w-0">
                  <p className="text-sm uppercase tracking-widest text-zinc-500">Job on screen</p>
                  <h3 className="mt-2 text-xl font-semibold text-zinc-50 break-words">{screenTitle}</h3>
                  <p className="mt-3 text-base leading-relaxed text-zinc-300 break-words">{screenBody}</p>
                </div>
                <aside className="p-4 bg-zinc-900/80 min-w-0" aria-label="Extension side panel">
                  <p className="text-sm font-semibold tracking-wide text-amber-200">Sovereign</p>
                  <p className="mt-1 text-sm text-zinc-400">Scan the job on screen</p>
                  <div className="mt-4 ml-auto flex w-full max-w-[168px] flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => scanScreen()}
                      className="w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-tight text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-600"
                    >
                      {scanPhase === 'scanning' ? 'Scanning…' : 'Scan Active Screen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setB2bOpen((open) => !open)}
                      className="w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-tight text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-600"
                    >
                      B2B
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-300" aria-live="polite">
                    {scanPhase === 'idle' && 'Click Scan Active Screen'}
                    {scanPhase === 'scanning' && 'Scanning…'}
                    {scanPhase === 'done' && scanMatch && `${scanMatch.matchScore}% match · ${matchBand(scanMatch.matchScore)}`}
                  </p>
                </aside>
              </div>
              <div
                className={`absolute inset-y-0 right-0 w-full max-w-sm border-l border-amber-400/30 bg-zinc-950/95 backdrop-blur-md p-5 transition-transform duration-300 ${b2bOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
                aria-hidden={!b2bOpen}
              >
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-50 min-w-0 truncate">B2B panel</h3>
                  <button type="button" className="text-sm text-zinc-400" onClick={() => setB2bOpen(false)}>
                    Close
                  </button>
                </div>
                <p className="mt-2 text-base leading-relaxed text-zinc-300">
                  Lead extraction stays idle until you ask for it.
                </p>
                <button
                  type="button"
                  onClick={extractLeads}
                  className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950"
                >
                  <ScanLine className="w-4 h-4" />
                  {leadPhase === 'extracting' ? 'Extracting…' : 'Lead Extraction'}
                </button>
                <ul className="mt-5 space-y-3">
                  {leadPhase === 'done' && SAMPLE_LEADS.map((lead) => (
                    <li key={lead.company} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 min-w-0">
                      <p className="text-base font-medium text-zinc-50 truncate">{lead.company}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-300 break-words">{lead.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-12" aria-label="AppSumo lifetime tiers">
            <div className="mb-6">
              <p className="text-sm font-medium tracking-[0.16em] uppercase text-amber-300/90">Lifetime deal</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-50">Pick the credit tier that matches how you sell.</h2>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-zinc-300">
                Monthly credits refresh on their own. Starter and Pro stay on freelancer tools. Agency adds B2B lead extraction and bulk pitch.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {APPSUMO_LTD_TIERS.map((tier) => {
                const agency = tier.numericTier === 3;
                const credits = tier.monthlyCredits.toLocaleString('en-US');
                return (
                  <article
                    key={tier.id}
                    className={`rounded-2xl border p-5 ${agency ? 'border-amber-400/50 bg-amber-400/5 shadow-[0_0_32px_rgba(245,158,11,0.12)]' : 'border-white/10 bg-zinc-900/60'}`}
                  >
                    <h3 className="text-xl font-semibold text-zinc-50">{agency ? 'Agency' : tier.label}</h3>
                    <p className="mt-2 text-base font-medium text-amber-200">
                      {credits} credits/mo{agency ? ' + B2B' : ''}
                    </p>
                    <p className="mt-3 flex items-start gap-2 text-base leading-relaxed text-zinc-200">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-amber-300" />
                      {TIER_LINE[tier.numericTier]}
                    </p>
                    <p className="mt-3 text-sm text-zinc-400">${tier.priceUsd} lifetime</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link to="/redeem">
                <Button variant="gold" className="text-base px-6 h-11">
                  <Ticket className="w-4 h-4 mr-2" />
                  Redeem your code
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="outline" className="text-base px-6 h-11 border-amber-400/40 text-amber-100">
                  Start onboarding
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          <section className="mt-12 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 md:p-10 text-center shadow-[0_0_48px_rgba(245,158,11,0.12)]">
            <h2 className="text-3xl font-semibold text-zinc-50">Keep the next proposal and CV on your account.</h2>
            <p className="mt-3 mx-auto max-w-2xl text-base leading-relaxed text-zinc-300">
              Create a free account to claim your proposal and CV credits, or redeem an AppSumo code if you already have one.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth?mode=signup">
                <Button variant="gold" className="text-base px-6 h-11">
                  Claim free credits
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/redeem">
                <Button variant="outline" className="text-base px-6 h-11 border-amber-400/40 text-amber-100">
                  <Ticket className="w-4 h-4 mr-2" />
                  Redeem AppSumo code
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DemoPage;
