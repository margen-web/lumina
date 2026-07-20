BEGIN;

-- 1. Create lumina_admins
CREATE TABLE IF NOT EXISTS public.lumina_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lumina_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read their own record" ON public.lumina_admins;
CREATE POLICY "Admins can read their own record" ON public.lumina_admins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Protect lumina_news
ALTER TABLE public.lumina_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view news" ON public.lumina_news;
CREATE POLICY "Public can view news" ON public.lumina_news
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update news" ON public.lumina_news;
CREATE POLICY "Admins can update news" ON public.lumina_news
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert news" ON public.lumina_news;
CREATE POLICY "Admins can insert news" ON public.lumina_news
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can delete news" ON public.lumina_news;
CREATE POLICY "Admins can delete news" ON public.lumina_news
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

-- 3. Protect lumina_events (Analytics)
ALTER TABLE public.lumina_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert valid events" ON public.lumina_events;
CREATE POLICY "Anyone can insert valid events" ON public.lumina_events
  FOR INSERT
  WITH CHECK (
    event_name IN ('page_view', 'news_view', 'feed_complete', 'news_share')
    AND length(device_uuid) > 0 AND length(device_uuid) <= 100
    AND (news_id IS NULL OR length(news_id) <= 50)
  );

DROP POLICY IF EXISTS "Only admins can read events" ON public.lumina_events;
CREATE POLICY "Only admins can read events" ON public.lumina_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

-- 4. Create secure RPC for metrics (new signature without passcode)
CREATE OR REPLACE FUNCTION public.get_lumina_metrics()
RETURNS TABLE (
  total_views int,
  unique_visitors int,
  feed_completes int,
  shares int,
  news_views jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify admin status
  IF NOT EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT count(*)::int FROM public.lumina_events WHERE event_name = 'page_view') as total_views,
    (SELECT count(distinct device_uuid)::int FROM public.lumina_events) as unique_visitors,
    (SELECT count(*)::int FROM public.lumina_events WHERE event_name = 'feed_complete') as feed_completes,
    (SELECT count(*)::int FROM public.lumina_events WHERE event_name = 'news_share') as shares,
    COALESCE(
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
    ) as news_views;
END;
$$;

COMMIT;
