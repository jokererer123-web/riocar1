import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
let browserClient: SupabaseClient | null | undefined;

export function hasSupabase() {
  return Boolean(url && anon);
}

/** Reuse one browser client so auth state and realtime channels remain consistent. */
export function supabaseBrowser(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!browserClient) {
    browserClient = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}
