DROP POLICY IF EXISTS "System can insert credit transactions for users" ON public.credit_transactions;

CREATE POLICY "No direct credit transaction inserts"
ON public.credit_transactions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);