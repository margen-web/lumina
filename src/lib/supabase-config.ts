function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`LUMINA CONFIG ERROR: Falta la variable ${name}`);
  }
  return value;
}

export const SUPABASE_URL = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
