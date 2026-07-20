const SUPABASE_URL = "https://btyfqihnriqlobxcbvno.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eWZxaWhucmlxbG9ieGNidm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA4MDcsImV4cCI6MjA5NDA5NjgwN30.P5b8vV_roeN0PsCJpGwua8XyPrK2T8DlsKGSvALI_5U";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json"
};

async function testRLS() {
  console.log("--- Testing lumina_news ---");
  // Try inserting
  let res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_news`, {
    method: 'POST',
    headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify({ category: "Test", title: "Test", summary: "Test", source_url: "Test" })
  });
  console.log("POST /lumina_news:", res.status, await res.text());

  // Try updating
  res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_news?id=eq.1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title: "Hacked!" })
  });
  console.log("PATCH /lumina_news:", res.status, await res.text());

  // Try deleting
  res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_news?id=eq.1`, {
    method: 'DELETE',
    headers
  });
  console.log("DELETE /lumina_news:", res.status, await res.text());

  console.log("\n--- Testing lumina_reactions ---");
  res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_reactions`, {
    method: 'POST',
    headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify({ news_id: "1", count: 9999 })
  });
  console.log("POST /lumina_reactions:", res.status, await res.text());

  res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_reactions?news_id=eq.1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ count: 9999 })
  });
  console.log("PATCH /lumina_reactions:", res.status, await res.text());

  console.log("\n--- Testing RPC get_lumina_metrics ---");
  res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_lumina_metrics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ passcode_param: "wrong" })
  });
  console.log("RPC get_lumina_metrics (wrong pass):", res.status, await res.text());

  res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_lumina_metrics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}) // no pass
  });
  console.log("RPC get_lumina_metrics (no pass):", res.status, await res.text());

  console.log("\n--- Testing RPC update_lumina_news ---");
  res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_lumina_news`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      news_id_param: "1",
      category_param: "Test",
      title_param: "Test",
      summary_param: "Test",
      source_url_param: "Test",
      passcode_param: "wrong"
    })
  });
  console.log("RPC update_lumina_news (wrong pass):", res.status, await res.text());
}

testRLS().catch(console.error);
