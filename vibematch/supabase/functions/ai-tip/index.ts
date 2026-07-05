// AI tip generator (ports server/proxy.mjs to an authenticated edge function).
// - real user JWT required: guests don't get AI tips
// - 20 calls per user per day via ai_tip_usage (service-role only table)
// - ANTHROPIC_API_KEY lives in function secrets, never in the client
import { corsPreflight, json } from "../_shared/cors.ts";
import { getUserFromRequest, serviceClient } from "../_shared/auth.ts";

const DAILY_LIMIT = 20;

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const user = await getUserFromRequest(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "not configured" }, 503);

  // ── Rate limit: one upsert + check ──
  const admin = serviceClient();
  const { data: usage } = await admin
    .from("ai_tip_usage")
    .select("calls")
    .eq("user_id", user.id)
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const calls = usage?.calls ?? 0;
  if (calls >= DAILY_LIMIT) return json({ error: "rate limited", tip: null }, 429);
  await admin.from("ai_tip_usage").upsert(
    { user_id: user.id, day: new Date().toISOString().slice(0, 10), calls: calls + 1 },
    { onConflict: "user_id,day" }
  );

  const { liked, disliked, context, weather, locale } = await req.json().catch(() => ({}));
  const lang = locale === "en" ? "English" : "Russian";

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: `You are VibeMatch's assistant. One short phrase in ${lang} (max 2 sentences). No greetings.`,
      messages: [
        {
          role: "user",
          content: `Liked: ${(liked ?? []).join(", ") || "nothing"}. Disliked: ${(disliked ?? []).join(", ") || "nothing"}. Vibe: ${context?.mood}, ${context?.people}, ${context?.time}. Weather: ${weather}.`,
        },
      ],
    }),
  });
  const data = await r.json();
  const tip = data?.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text ?? "";
  return json({ tip });
});
