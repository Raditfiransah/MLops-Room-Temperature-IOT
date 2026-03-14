import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

let supabase: SupabaseClient;

if (supabaseUrl && supabaseUrl.startsWith("http")) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Fallback: create a dummy client that won't crash at build time
  supabase = createClient("https://placeholder.supabase.co", "placeholder");
}

export { supabase };
