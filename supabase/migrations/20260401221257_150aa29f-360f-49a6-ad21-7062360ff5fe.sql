ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_credits_granted boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key text NOT NULL UNIQUE,
  name text NOT NULL,
  credits integer NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  checkout_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packages"
ON public.credit_packages
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage credit packages"
ON public.credit_packages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  transaction_type text NOT NULL,
  reference_type text,
  reference_id text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit transactions for users"
ON public.credit_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at
ON public.credit_transactions(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_credit_change(
  _user_id uuid,
  _amount integer,
  _transaction_type text,
  _reference_type text DEFAULT NULL,
  _reference_id text DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_balance integer;
  _new_balance integer;
BEGIN
  SELECT credits_balance INTO _current_balance
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  _new_balance := _current_balance + _amount;

  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.profiles
  SET credits_balance = _new_balance,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    reference_type,
    reference_id,
    description
  ) VALUES (
    _user_id,
    _amount,
    _new_balance,
    _transaction_type,
    _reference_type,
    _reference_id,
    _description
  );

  RETURN _new_balance;
END;
$$;

INSERT INTO public.credit_packages (package_key, name, credits, price_usd, checkout_url, is_active)
VALUES
  ('free-starter', 'Free Starter', 100, 0, NULL, true),
  ('credits-500', '500 Credits', 500, 10, NULL, true),
  ('credits-1200', '1200 Credits', 1200, 20, NULL, true)
ON CONFLICT (package_key) DO UPDATE
SET name = EXCLUDED.name,
    credits = EXCLUDED.credits,
    price_usd = EXCLUDED.price_usd,
    checkout_url = EXCLUDED.checkout_url,
    is_active = EXCLUDED.is_active,
    updated_at = now();