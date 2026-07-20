BEGIN;

-- 1. Remove new RPC function
DROP FUNCTION IF EXISTS public.get_lumina_metrics();

-- 2. Clean up policies created in preparatory migration
DROP POLICY IF EXISTS "Admins can read their own record" ON public.lumina_admins;
DROP POLICY IF EXISTS "Public can view news" ON public.lumina_news;
DROP POLICY IF EXISTS "Admins can update news" ON public.lumina_news;
DROP POLICY IF EXISTS "Admins can insert news" ON public.lumina_news;
DROP POLICY IF EXISTS "Admins can delete news" ON public.lumina_news;
DROP POLICY IF EXISTS "Anyone can insert valid events" ON public.lumina_events;
DROP POLICY IF EXISTS "Only admins can read events" ON public.lumina_events;

-- 3. Restore baseline protected RLS state without leaving tables open
ALTER TABLE public.lumina_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view news" ON public.lumina_news FOR SELECT USING (true);

ALTER TABLE public.lumina_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert valid events" ON public.lumina_events FOR INSERT WITH CHECK (true);

-- 4. Remove lumina_admins table
DROP TABLE IF EXISTS public.lumina_admins;

COMMIT;
