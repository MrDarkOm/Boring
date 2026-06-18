import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(url, anonKey);
