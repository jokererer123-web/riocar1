import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = url && anon ? createClient(url, anon) : null;
