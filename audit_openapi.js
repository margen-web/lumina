import fs from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btyfqihnriqlobxcbvno.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eWZxaWhucmlxbG9ieGNidm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA4MDcsImV4cCI6MjA5NDA5NjgwN30.P5b8vV_roeN0PsCJpGwua8XyPrK2T8DlsKGSvALI_5U';

async function auditOpenAPI() {
  const headers = { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY };

  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/', { headers });
    const text = await r.text();
    console.log(text);
  } catch(e) { console.log(e.message); }
}

auditOpenAPI();
