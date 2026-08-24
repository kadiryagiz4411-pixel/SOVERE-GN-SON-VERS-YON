import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, SkipForward, RotateCcw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GatedAppPage } from '@/components/auth/GatedAppPage';

const QUESTIONS = [
  'Tell me about yourself and the role you are targeting.',
  'Walk me through a project where you had a measurable impact. What was the outcome?',
  'Describe a time you disagreed with a stakeholder. How did you resolve it?',
  'What is your greatest professional weakness, and how are you addressing it?',
  'How do you prioritize when everything feels urgent?',
  'Explain a technical decision you made recently and why you chose that approach.',
  'Where do you want to be in 18 months, and how does this role get you there?',
  'Do you have questions for me as the hiring manager?',
];

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
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

export default function InterviewSimulator() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [log, setLog] = useState<Array<{ q: string; a: string }>>([]);
  const [listening, setListening] = useState(false);
  const recRef = useRef<BrowserSpeechRecognition | null>(null);

  const question = QUESTIONS[index];

  useEffect(() => {
    speak(`Question ${index + 1}. ${question}`);
    return () => window.speechSynthesis?.cancel();
  }, [index, question]);

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

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const submitAnswer = () => {
    setLog((prev) => [...prev, { q: question, a: answer.trim() || '(skipped)' }]);
    setAnswer('');
    if (index < QUESTIONS.length - 1) setIndex(index + 1);
  };

  return (
    <GatedAppPage
      required="elite"
      featureName="AI Interview Simulator"
      description="Interactive voice and text mock interviews are locked to Elite and above."
    >
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Elite · Voice + Text</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Interview Simulator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Question {index + 1} of {QUESTIONS.length}. Speak or type your answer. The interviewer uses your browser speech APIs.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <p className="text-lg font-medium text-foreground">{question}</p>
          </div>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer or use the microphone..."
            className="min-h-[140px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => speak(question)}>
              <Volume2 className="w-4 h-4 mr-2" /> Replay question
            </Button>
            {listening ? (
              <Button type="button" variant="destructive" onClick={stopListening}>
                <MicOff className="w-4 h-4 mr-2" /> Stop listening
              </Button>
            ) : (
              <Button type="button" onClick={startListening}>
                <Mic className="w-4 h-4 mr-2" /> Speak answer
              </Button>
            )}
            <Button type="button" onClick={submitAnswer}>
              <SkipForward className="w-4 h-4 mr-2" /> Submit & next
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setIndex(0); setLog([]); setAnswer(''); }}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Restart
            </Button>
          </div>
        </div>

        {log.length > 0 && (
          <div className="rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Session log
            </h2>
            {log.map((item, i) => (
              <div key={i} className="text-sm border-b border-border/60 pb-3">
                <p className="font-medium text-foreground">Q{i + 1}. {item.q}</p>
                <p className="text-muted-foreground mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GatedAppPage>
  );
}
