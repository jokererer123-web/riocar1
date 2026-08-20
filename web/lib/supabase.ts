import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function hasSupabase() {
  return Boolean(url && anon);
}

export function supabaseBrowser(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  return createClient(url, anon);
}
