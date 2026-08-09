
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, credits_balance, free_credits_granted)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', 100, true);

  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_type, description)
  VALUES (new.id, 100, 100, 'signup_bonus', 'system', 'Welcome bonus – 100 credits');

  RETURN new;
END;
$$;
