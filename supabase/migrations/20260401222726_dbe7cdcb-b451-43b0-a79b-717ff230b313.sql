DROP POLICY IF EXISTS "Authenticated users can access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles restricted to owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profile inserts restricted to owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profile updates restricted to owner or admin" ON public.profiles;

CREATE POLICY "Authenticated users can attempt profile reads"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can attempt profile inserts"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can attempt profile updates"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Profiles restricted to owner or admin"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profile inserts restricted to owner or admin"
ON public.profiles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profile updates restricted to owner or admin"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Credit transactions restricted to owner or admin" ON public.credit_transactions;

CREATE POLICY "Authenticated users can attempt credit transaction reads"
ON public.credit_transactions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Credit transactions restricted to owner or admin"
ON public.credit_transactions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can access roles" ON public.user_roles;
DROP POLICY IF EXISTS "Role reads restricted to owner or admin" ON public.user_roles;
DROP POLICY IF EXISTS "Role inserts restricted to admin" ON public.user_roles;
DROP POLICY IF EXISTS "Role deletes restricted to admin" ON public.user_roles;

CREATE POLICY "Authenticated users can attempt role reads"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can attempt role inserts"
ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can attempt role deletes"
ON public.user_roles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Role reads restricted to owner or admin"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Role inserts restricted to admin"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Role deletes restricted to admin"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));