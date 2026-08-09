ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can access profiles"
ON public.profiles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

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

DROP POLICY IF EXISTS "Admins can view all credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "System can insert credit transactions for users" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can view their own credit transactions" ON public.credit_transactions;

CREATE POLICY "Authenticated users can read credit transactions"
ON public.credit_transactions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Credit transactions restricted to owner or admin"
ON public.credit_transactions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Authenticated users can access roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

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