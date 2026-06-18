import { supabase } from "./supabase";
import type { Card, SwipeRecord, UserContext } from "../types";
import type { Profile } from "../types";

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function syncProfile(userId: string, profile: Profile, context: UserContext) {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .upsert({ id: userId, name: profile.name, avatar: profile.avatar, context }, { onConflict: "id" });
}

export async function loadProfile(userId: string): Promise<{ profile: Profile; context: UserContext } | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!data) return null;
  return {
    profile: { name: data.name, avatar: data.avatar },
    context: (data.context as UserContext) ?? { mood: null, people: null, time: null, genres: [] },
  };
}

// ─── Saved items ─────────────────────────────────────────────────────────────

export async function syncSaved(userId: string, saved: Card[]) {
  if (!supabase) return;
  await supabase.from("saved_items").delete().eq("user_id", userId);
  if (!saved.length) return;
  await supabase.from("saved_items").insert(
    saved.map((c) => ({ user_id: userId, card_id: c.id, card_data: c as unknown as Record<string, unknown> }))
  );
}

export async function loadSaved(userId: string): Promise<Card[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("saved_items").select("card_data").eq("user_id", userId);
  return (data ?? []).map((r) => r.card_data as unknown as Card);
}

export async function updateComment(userId: string, cardId: number, comment: string) {
  if (!supabase) return;
  await supabase
    .from("saved_items")
    .update({ comment })
    .eq("user_id", userId)
    .eq("card_id", cardId);
}

// ─── Swipe history ────────────────────────────────────────────────────────────

export async function syncHistory(userId: string, history: SwipeRecord[]) {
  if (!supabase) return;
  await supabase.from("swipe_history").delete().eq("user_id", userId);
  if (!history.length) return;
  await supabase.from("swipe_history").insert(
    history.map((h) => ({
      user_id: userId,
      card_id: h.card.id,
      card_data: h.card as unknown as Record<string, unknown>,
      direction: h.dir,
    }))
  );
}

export async function loadHistory(userId: string): Promise<SwipeRecord[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("swipe_history")
    .select("card_data, direction")
    .eq("user_id", userId)
    .order("created_at");
  return (data ?? []).map((r) => ({
    card: r.card_data as unknown as Card,
    dir: r.direction as SwipeRecord["dir"],
  }));
}
