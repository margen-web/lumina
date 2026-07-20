BEGIN;

-- 1. Dynamic cleanup: Drop ALL pre-existing policies on target tables to prevent OR combination
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('lumina_news', 'lumina_events', 'lumina_admins')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. Create lumina_admins table if not exists
CREATE TABLE IF NOT EXISTS public.lumina_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lumina_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their own record" ON public.lumina_admins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Protect lumina_news
ALTER TABLE public.lumina_news ENABLE ROW LEVEL SECURITY;

-- Public read access for news
CREATE POLICY "Public can view news" ON public.lumina_news
  FOR SELECT USING (true);

-- Admin-only mutations for news (INSERT/UPDATE/DELETE implicitly blocked for non-admins)
CREATE POLICY "Admins can update news" ON public.lumina_news
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert news" ON public.lumina_news
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete news" ON public.lumina_news
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

-- 4. Protect lumina_events (Analytics)
ALTER TABLE public.lumina_events ENABLE ROW LEVEL SECURITY;

-- Public validated insert for events
CREATE POLICY "Anyone can insert valid events" ON public.lumina_events
  FOR INSERT
  WITH CHECK (
    event_name IN ('page_view', 'news_view', 'feed_complete', 'news_share')
    AND length(device_uuid::text) > 0 AND length(device_uuid::text) <= 100
    AND (news_id IS NULL OR length(news_id::text) <= 50)
  );

-- Only admins can read events (SELECT/UPDATE/DELETE blocked for anon and non-admin users)
CREATE POLICY "Only admins can read events" ON public.lumina_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

-- 5. Create secure RPC for metrics returning jsonb object
CREATE OR REPLACE FUNCTION public.get_lumina_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify admin status
  IF NOT EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_views', COALESCE((SELECT count(*)::int FROM public.lumina_events WHERE event_name = 'page_view'), 0),
    'unique_visitors', COALESCE((SELECT count(distinct device_uuid)::int FROM public.lumina_events), 0),
    'feed_completes', COALESCE((SELECT count(*)::int FROM public.lumina_events WHERE event_name = 'feed_complete'), 0),
    'shares', COALESCE((SELECT count(*)::int FROM public.lumina_events WHERE event_name = 'news_share'), 0),
    'news_views', COALESCE(
      (
        SELECT jsonb_object_agg(news_id, views) 
        FROM (
          SELECT news_id::text as news_id, count(*)::int as views 
          FROM public.lumina_events 
          WHERE event_name = 'news_view' AND news_id IS NOT NULL 
          GROUP BY news_id
        ) sub
      ), 
      '{}'::jsonb
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMIT;
