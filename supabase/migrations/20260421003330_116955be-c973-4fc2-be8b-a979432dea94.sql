
-- Apply Queue table for preloaded job recommendations
CREATE TABLE public.apply_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'Upwork',
  budget TEXT DEFAULT '',
  job_url TEXT DEFAULT '',
  job_description TEXT NOT NULL DEFAULT '',
  match_score INTEGER NOT NULL DEFAULT 0,
  acceptance_probability INTEGER NOT NULL DEFAULT 0,
  match_reasoning JSONB DEFAULT '[]'::jsonb,
  rejection_reason TEXT DEFAULT NULL,
  generated_proposal TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  user_notes TEXT DEFAULT '',
  skills_matched TEXT[] DEFAULT '{}',
  competition_level TEXT NOT NULL DEFAULT 'medium',
  client_quality_score INTEGER DEFAULT 50,
  urgency TEXT NOT NULL DEFAULT 'medium',
  batch_id TEXT DEFAULT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apply_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue" ON public.apply_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue" ON public.apply_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue" ON public.apply_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue" ON public.apply_queue FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_apply_queue_user_status ON public.apply_queue (user_id, status);
CREATE INDEX idx_apply_queue_user_created ON public.apply_queue (user_id, created_at DESC);

CREATE TRIGGER update_apply_queue_updated_at
  BEFORE UPDATE ON public.apply_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Outcome tracking table for learning loop
CREATE TABLE public.outcome_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES public.apply_queue(id) ON DELETE SET NULL,
  was_viewed BOOLEAN DEFAULT false,
  client_replied BOOLEAN DEFAULT false,
  outcome TEXT DEFAULT 'pending',
  proposal_style_tags TEXT[] DEFAULT '{}',
  job_platform TEXT DEFAULT '',
  job_category TEXT DEFAULT '',
  match_score_at_apply INTEGER DEFAULT 0,
  lessons_learned TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outcomes" ON public.outcome_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outcomes" ON public.outcome_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outcomes" ON public.outcome_tracking FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_outcome_tracking_user ON public.outcome_tracking (user_id);

CREATE TRIGGER update_outcome_tracking_updated_at
  BEFORE UPDATE ON public.outcome_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
