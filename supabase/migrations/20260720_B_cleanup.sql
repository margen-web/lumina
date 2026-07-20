BEGIN;

-- Drop the old RPC functions that rely on passcode
DROP FUNCTION IF EXISTS public.get_lumina_metrics(text);
DROP FUNCTION IF EXISTS public.update_lumina_news(text, text, text, text, text, text);

COMMIT;
