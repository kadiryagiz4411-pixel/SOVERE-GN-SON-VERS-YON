import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, SkipForward, RotateCcw, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateInterviewQuestions, scoreAnswer, type InterviewFeedback, type InterviewQuestion } from '@/services/interviewSim';

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): BrowserSpeechRecognition | null {
  const Ctor = (window as unknown as {
    SpeechRecognition?: { new (): BrowserSpeechRecognition };
    webkitSpeechRecognition?: { new (): BrowserSpeechRecognition };
  }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: { new (): BrowserSpeechRecognition } }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = 'en-US';
  return rec;
}

export function InterviewSimulatorPanel() {
  const [cvText, setCvText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [log, setLog] = useState<Array<{ q: string; a: string; feedback: InterviewFeedback }>>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<BrowserSpeechRecognition | null>(null);
  const question = questions[index];

  useEffect(() => {
    if (!question) return;
    speak(`Question ${index + 1}. ${question.prompt}`);
    return () => window.speechSynthesis?.cancel();
  }, [index, question]);

  const startSession = async () => {
    setBusy(true);
    const qs = await generateInterviewQuestions(cvText, jobDescription);
    setQuestions(qs);
    setIndex(0);
    setLog([]);
    setAnswer('');
    setBusy(false);
  };

  const startListening = () => {
    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join(' ');
      setAnswer(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const submitAnswer = () => {
    if (!question) return;
    const feedback = scoreAnswer(answer, question, jobDescription);
    setLog((prev) => [...prev, { q: question.prompt, a: answer.trim() || '(skipped)', feedback }]);
    setAnswer('');
    if (index < questions.length - 1) setIndex(index + 1);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Elite · Voice + Text</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Interview Simulator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Role-specific behavioral and technical practice with live confidence, keyword, and STAR feedback.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Textarea value={cvText} onChange={(e) => setCvText(e.target.value)} placeholder="Paste CV / experience" className="min-h-[120px]" />
        <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job description" className="min-h-[120px]" />
      </div>
      <Button type="button" onClick={() => void startSession()} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Generate interview
      </Button>

      {question && (
        <div className="rounded-2xl border border-amber-500/20 bg-card p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{question.type} · {index + 1}/{questions.length}</p>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <p className="text-lg font-medium text-foreground">{question.prompt}</p>
          </div>
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type or speak your answer..." className="min-h-[140px]" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => speak(question.prompt)}>
              <Volume2 className="w-4 h-4 mr-2" /> Replay
            </Button>
            {listening ? (
              <Button type="button" variant="destructive" onClick={() => { recRef.current?.stop(); setListening(false); }}>
                <MicOff className="w-4 h-4 mr-2" /> Stop
              </Button>
            ) : (
              <Button type="button" onClick={startListening}>
                <Mic className="w-4 h-4 mr-2" /> Speak
              </Button>
            )}
            <Button type="button" onClick={submitAnswer}>
              <SkipForward className="w-4 h-4 mr-2" /> Submit & next
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setIndex(0); setLog([]); setAnswer(''); }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Restart
            </Button>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Feedback log
          </h2>
          {log.map((item, i) => (
            <div key={i} className="text-sm border-b border-border/60 pb-3 space-y-1">
              <p className="font-medium text-foreground">Q{i + 1}. {item.q}</p>
              <p className="text-muted-foreground">{item.a}</p>
              <p className="text-xs text-amber-300">
                Confidence {item.feedback.confidence}% · Keywords {item.feedback.keywordCoverage}% · Structure {item.feedback.structure}%
              </p>
              <ul className="text-xs text-muted-foreground list-disc pl-4">
                {item.feedback.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
