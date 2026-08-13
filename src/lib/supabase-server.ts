import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY SUPABASE CLIENT:
 * Este cliente se ejecuta exclusivamente en el entorno de servidor (Next.js Route Handlers / Server Actions).
 * Utiliza SUPABASE_SERVICE_ROLE_KEY para realizar inserciones autorizadas de analytics y bypass de RLS controlado.
 * NUNCA importar este módulo en componentes de cliente (React Client Components).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.warn("SERVER WARNING: Supabase URL no configurada en entorno de servidor.");
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
