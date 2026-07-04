import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// PKCE flow: works on web and is required for the native deep-link callback
export const supabase =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: { flowType: "pkce", detectSessionInUrl: true },
      })
    : null;
