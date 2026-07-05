// Resolves the calling user from the request's JWT.
// Returns null for anon-key-only requests (guests) and invalid tokens.
import { createClient } from "npm:@supabase/supabase-js@2";

export interface AuthedUser {
  id: string;
  email?: string;
}

export async function getUserFromRequest(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

// Service-role client for privileged operations (rate-limit table, admin API).
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
