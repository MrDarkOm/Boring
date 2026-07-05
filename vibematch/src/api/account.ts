import { supabase } from "./supabase";

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

// Calls the delete-account edge function with the user's JWT, then signs out.
// Local on-device data is left intact — the caller decides whether to reset.
export async function deleteAccount(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    },
  });
  if (!res.ok) return false;
  await supabase.auth.signOut();
  return true;
}
