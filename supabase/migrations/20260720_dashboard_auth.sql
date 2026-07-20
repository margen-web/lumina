-- 1. Crear tabla de administradores
CREATE TABLE IF NOT EXISTS public.lumina_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS en lumina_admins
ALTER TABLE public.lumina_admins ENABLE ROW LEVEL SECURITY;

-- Solo los usuarios autenticados pueden ver su propio registro para autorizarse
CREATE POLICY "Admins can read their own record" 
  ON public.lumina_admins 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- (La inserción será manual mediante el panel SQL de Supabase o API de service_role)

-- 2. Asegurar lumina_news
ALTER TABLE public.lumina_news ENABLE ROW LEVEL SECURITY;

-- Revocar políticas existentes por si había alguna permisiva u obsoleta
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lumina_news;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.lumina_news;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.lumina_news;

-- Crear nuevas políticas estrictas
CREATE POLICY "Public can view news" 
  ON public.lumina_news 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert news" 
  ON public.lumina_news 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update news" 
  ON public.lumina_news 
  FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete news" 
  ON public.lumina_news 
  FOR DELETE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.lumina_admins WHERE user_id = auth.uid()));

-- 3. Actualizar función de métricas
-- Eliminamos la antigua versión insegura
DROP FUNCTION IF EXISTS public.get_lumina_metrics(text);

-- Creamos la versión segura
CREATE OR REPLACE FUNCTION public.get_lumina_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    is_admin boolean;
    views_count int;
    visitors_count int;
    completes_count int;
    shares_count int;
    reactions_data json;
    result json;
BEGIN
    -- 1. Validar autorización
    SELECT EXISTS (
        SELECT 1 FROM public.lumina_admins 
        WHERE user_id = auth.uid()
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- 2. Recolectar datos
    SELECT COUNT(*) INTO views_count FROM public.lumina_analytics WHERE event_type = 'news_view';
    SELECT COUNT(DISTINCT session_id) INTO visitors_count FROM public.lumina_analytics;
    SELECT COUNT(*) INTO completes_count FROM public.lumina_analytics WHERE event_type = 'feed_complete';
    SELECT COUNT(*) INTO shares_count FROM public.lumina_analytics WHERE event_type = 'share';

    SELECT json_object_agg(news_id, count) INTO reactions_data
    FROM public.lumina_reactions;

    -- 3. Construir resultado
    result := json_build_object(
        'total_views', COALESCE(views_count, 0),
        'unique_visitors', COALESCE(visitors_count, 0),
        'feed_completes', COALESCE(completes_count, 0),
        'shares', COALESCE(shares_count, 0),
        'news_views', COALESCE(reactions_data, '{}'::json)
    );

    RETURN result;
END;
$$;

-- Revocamos el acceso anónimo a las métricas por si acaso
REVOKE EXECUTE ON FUNCTION public.get_lumina_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_lumina_metrics() FROM public;
GRANT EXECUTE ON FUNCTION public.get_lumina_metrics() TO authenticated;

-- 4. Eliminar función obsoleta de actualización (ahora usamos cliente con RLS)
DROP FUNCTION IF EXISTS public.update_lumina_news(text, text, text, text, text, text);
