import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY SUPABASE CLIENT (FAIL-CLOSED):
 * Este cliente se ejecuta exclusivamente en el entorno de servidor (Next.js Route Handlers).
 * Exige estrictamente SUPABASE_SERVICE_ROLE_KEY para realizar inserciones autorizadas de analytics.
 * NUNCA utiliza credenciales anónimas públicas como fallback.
 * Si falta la clave de servicio en tiempo de ejecución, falla inmediatamente y de forma explícita.
 */

let serverClientInstance: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "SERVER CONFIG ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable."
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SERVER SECURITY ERROR: Missing SUPABASE_SERVICE_ROLE_KEY. The server analytics client requires explicit service_role credentials and fails closed."
    );
  }

  serverClientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClientInstance;
}
