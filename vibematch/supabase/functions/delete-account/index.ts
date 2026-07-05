// Deletes the calling user's account. Requires a real user JWT.
// FK cascades from 001 wipe profiles/saved_items/swipe_history/coop data.
import { corsPreflight, json } from "../_shared/cors.ts";
import { getUserFromRequest, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const user = await getUserFromRequest(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const admin = serviceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
