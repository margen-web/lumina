BEGIN;

-- 1. Remove new RPC
DROP FUNCTION IF EXISTS public.get_lumina_metrics();

-- 2. Revert lumina_events RLS policies
DROP POLICY IF EXISTS "Anyone can insert valid events" ON public.lumina_events;
DROP POLICY IF EXISTS "Only admins can read events" ON public.lumina_events;
ALTER TABLE public.lumina_events DISABLE ROW LEVEL SECURITY;
-- Note: Assuming lumina_events had RLS disabled originally or we restore to disabled.

-- 3. Revert lumina_news RLS policies
DROP POLICY IF EXISTS "Public can view news" ON public.lumina_news;
DROP POLICY IF EXISTS "Admins can update news" ON public.lumina_news;
DROP POLICY IF EXISTS "Admins can insert news" ON public.lumina_news;
DROP POLICY IF EXISTS "Admins can delete news" ON public.lumina_news;
ALTER TABLE public.lumina_news DISABLE ROW LEVEL SECURITY;

-- 4. Drop lumina_admins table
DROP TABLE IF EXISTS public.lumina_admins;

COMMIT;
