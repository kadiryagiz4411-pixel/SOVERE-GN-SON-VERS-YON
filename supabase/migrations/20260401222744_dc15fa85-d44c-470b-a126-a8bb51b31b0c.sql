DROP POLICY IF EXISTS "Authenticated users can attempt profile reads" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can attempt profile inserts" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can attempt profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Profiles restricted to owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profile inserts restricted to owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profile updates restricted to owner or admin" ON public.profiles;

CREATE POLICY "Profiles owner or admin can read"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profiles owner or admin can insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profiles owner or admin can update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can attempt credit transaction reads" ON public.credit_transactions;
DROP POLICY IF EXISTS "Credit transactions restricted to owner or admin" ON public.credit_transactions;

CREATE POLICY "Credit transactions owner or admin can read"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can attempt role reads" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can attempt role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can attempt role deletes" ON public.user_roles;
DROP POLICY IF EXISTS "Role reads restricted to owner or admin" ON public.user_roles;
DROP POLICY IF EXISTS "Role inserts restricted to admin" ON public.user_roles;
DROP POLICY IF EXISTS "Role deletes restricted to admin" ON public.user_roles;

CREATE POLICY "Roles owner or admin can read"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));