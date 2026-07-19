import { createClient } from "@supabase/supabase-js";

const isTest = import.meta.env.MODE === "test";
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  (isTest ? "http://127.0.0.1:54321" : "");
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  (isTest ? "test-publishable-key" : "");

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});
