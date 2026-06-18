import { supabase } from "./supabase";

function makeCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── Create a coop session (host) ─────────────────────────────────────────────
export async function createCoopSession(hostId: string): Promise<string | null> {
  const code = makeCode();
  const { data, error } = await supabase!
    .from("coop_sessions")
    .insert({ code, host_id: hostId, status: "waiting" })
    .select("code")
    .single();
  if (error) return null;
  return data?.code ?? null;
}

// ─── Join a coop session (guest) ──────────────────────────────────────────────
export async function joinCoopSession(code: string, guestId: string): Promise<string | null> {
  const { data, error } = await supabase!
    .from("coop_sessions")
    .update({ guest_id: guestId, status: "active" })
    .eq("code", code)
    .eq("status", "waiting")
    .select("id")
    .single();
  if (error) return null;
  return data?.id ?? null;
}

// ─── Get session by code ──────────────────────────────────────────────────────
export async function getCoopSession(code: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("coop_sessions")
    .select("*")
    .eq("code", code)
    .single();
  return data;
}

// ─── Submit a swipe in coop ───────────────────────────────────────────────────
export async function coopSwipe(sessionId: string, userId: string, cardId: number, direction: "left" | "right" | "up") {
  await supabase!.from("coop_swipes").insert({ session_id: sessionId, user_id: userId, card_id: cardId, direction });
}

// ─── Check for match (both swiped right on same card) ────────────────────────
export async function checkCoopMatch(sessionId: string, cardId: number): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("coop_swipes")
    .select("user_id")
    .eq("session_id", sessionId)
    .eq("card_id", cardId)
    .eq("direction", "right");
  return (data?.length ?? 0) >= 2;
}
