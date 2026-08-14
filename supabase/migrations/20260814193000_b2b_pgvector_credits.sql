-- =====================================================================
-- Migration: pgvector Embeddings + Pay-As-You-Go B2B Credit System
-- =====================================================================

-- ── Enable pgvector extension ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Add embedding column to candidate_evaluations ─────────────────────────
-- text-embedding-3-small produces 1536-dimensional vectors
ALTER TABLE public.candidate_evaluations
  ADD COLUMN IF NOT EXISTS embedding vector(1536) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- HNSW index for sub-10ms approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_candidate_embeddings_hnsw
  ON public.candidate_evaluations
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── B2B Credit Ledger (per-org balance) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.b2b_credit_ledger (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  credits_balance   INTEGER NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  credits_lifetime  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view credit balance"
  ON public.b2b_credit_ledger
  FOR SELECT
  USING (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_b2b_credit_ledger_updated_at
  BEFORE UPDATE ON public.b2b_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── B2B Credit Transactions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.b2b_credit_transactions (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL,       -- positive = credit, negative = debit
  balance_after     INTEGER NOT NULL,
  transaction_type  TEXT NOT NULL
                      CHECK (transaction_type IN ('purchase', 'evaluation', 'refund', 'bonus', 'expiry')),
  reference_id      TEXT DEFAULT NULL,      -- evaluation_id, payment_id, etc.
  description       TEXT NOT NULL DEFAULT '',
  performed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view credit transactions"
  ON public.b2b_credit_transactions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_b2b_credit_txn_org ON public.b2b_credit_transactions (organization_id, created_at DESC);

-- ── B2B Credit Packages (catalog) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.b2b_credit_packages (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  credits          INTEGER NOT NULL,
  price_usd        NUMERIC(8,2) NOT NULL,
  bonus_credits    INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view credit packages"
  ON public.b2b_credit_packages
  FOR SELECT
  USING (is_active = TRUE);

-- Seed default packages
INSERT INTO public.b2b_credit_packages (name, credits, price_usd, bonus_credits, sort_order)
VALUES
  ('Starter Pack',   100,   49.00,   0,  1),
  ('Growth Pack',    300,  129.00,  30,  2),
  ('Agency Pack',    750,  299.00, 100,  3),
  ('Enterprise Pack',2000, 699.00, 350,  4)
ON CONFLICT DO NOTHING;

-- ── RPC: consume_b2b_credit ────────────────────────────────────────────────
-- Deducts credits for a single evaluation. Returns TRUE if successful.
CREATE OR REPLACE FUNCTION public.consume_b2b_credit(
  _org_id       UUID,
  _amount       INTEGER DEFAULT 10,
  _reference_id TEXT    DEFAULT NULL,
  _description  TEXT    DEFAULT 'CV Evaluation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT credits_balance INTO v_balance
    FROM public.b2b_credit_ledger
    WHERE organization_id = _org_id
    FOR UPDATE;

  IF v_balance IS NULL OR v_balance < _amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.b2b_credit_ledger
    SET credits_balance = credits_balance - _amount
    WHERE organization_id = _org_id;

  INSERT INTO public.b2b_credit_transactions
    (organization_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES
    (_org_id, -_amount, v_balance - _amount, 'evaluation', _reference_id, _description);

  RETURN TRUE;
END;
$$;

-- ── RPC: add_b2b_credits ──────────────────────────────────────────────────
-- Adds credits (purchase/bonus). Creates ledger row if not exists.
CREATE OR REPLACE FUNCTION public.add_b2b_credits(
  _org_id      UUID,
  _amount      INTEGER,
  _type        TEXT    DEFAULT 'purchase',
  _reference   TEXT    DEFAULT NULL,
  _description TEXT    DEFAULT 'Credit purchase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO public.b2b_credit_ledger (organization_id, credits_balance, credits_lifetime)
    VALUES (_org_id, _amount, _amount)
    ON CONFLICT (organization_id) DO UPDATE
      SET credits_balance  = b2b_credit_ledger.credits_balance + _amount,
          credits_lifetime = b2b_credit_ledger.credits_lifetime + _amount
    RETURNING credits_balance INTO v_new_balance;

  INSERT INTO public.b2b_credit_transactions
    (organization_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES
    (_org_id, _amount, v_new_balance, _type, _reference, _description);

  RETURN v_new_balance;
END;
$$;

-- ── RPC: search_talent_pool ───────────────────────────────────────────────
-- Vector similarity search across org's entire candidate pool
CREATE OR REPLACE FUNCTION public.search_talent_pool(
  _org_id           UUID,
  _query_embedding  vector(1536),
  _match_threshold  FLOAT    DEFAULT 0.65,
  _match_count      INTEGER  DEFAULT 20,
  _min_score        FLOAT    DEFAULT 0,
  _verdict_filter   TEXT[]   DEFAULT NULL
)
RETURNS TABLE (
  id                      UUID,
  candidate_name          TEXT,
  candidate_email         TEXT,
  job_posting_id          UUID,
  match_score_percentage  NUMERIC,
  confidence_score        NUMERIC,
  statistical_metrics     JSONB,
  ai_analysis             JSONB,
  processing_status       TEXT,
  created_at              TIMESTAMPTZ,
  similarity              FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.candidate_name,
    ce.candidate_email,
    ce.job_posting_id,
    ce.match_score_percentage,
    ce.confidence_score,
    ce.statistical_metrics,
    ce.ai_analysis,
    ce.processing_status,
    ce.created_at,
    1 - (ce.embedding <=> _query_embedding) AS similarity
  FROM public.candidate_evaluations ce
  WHERE
    ce.organization_id = _org_id
    AND ce.processing_status = 'completed'
    AND ce.embedding IS NOT NULL
    AND (ce.match_score_percentage IS NULL OR ce.match_score_percentage >= _min_score)
    AND (
      _verdict_filter IS NULL
      OR (ce.ai_analysis->>'hiring_verdict') = ANY(_verdict_filter)
    )
    AND 1 - (ce.embedding <=> _query_embedding) >= _match_threshold
  ORDER BY ce.embedding <=> _query_embedding
  LIMIT _match_count;
END;
$$;

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_b2b_credit_ledger_org ON public.b2b_credit_ledger (organization_id);
