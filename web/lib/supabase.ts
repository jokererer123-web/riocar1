import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const STORAGE_KEY = "rio.supabase.public-config";
let browserClient: SupabaseClient | null | undefined;

function storedConfig(): { url: string; anon: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value?.url && value?.anon ? value : null;
  } catch { return null; }
}

export function getSupabaseConfig() {
  return envUrl && envAnon ? { url: envUrl, anon: envAnon } : storedConfig();
}

export function hasSupabase() {
  return Boolean(getSupabaseConfig());
}

/** Save only the public project URL and publishable/anon key on this device. */
export function configureSupabase(url: string, anon: string) {
  if (typeof window === "undefined") return false;
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanAnon = anon.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cleanUrl) || cleanAnon.length < 20) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: cleanUrl, anon: cleanAnon }));
  browserClient = undefined;
  return true;
}

export function clearSupabaseConfig() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  browserClient = undefined;
}

/** Reuse one browser client so auth state and realtime channels remain consistent. */
export function supabaseBrowser(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  if (!browserClient) {
    browserClient = createClient(config.url, config.anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}
