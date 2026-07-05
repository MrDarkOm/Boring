import { supabase } from "./supabase";
import type { Card, SwipeRecord, UserContext } from "../types";
import type { Profile } from "../types";
import { normalizeCard, normalizeContext, normalizeHistory } from "../lib/normalize";

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function syncProfile(userId: string, profile: Profile, context: UserContext) {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .upsert({ id: userId, name: profile.name, avatar: profile.avatar, context }, { onConflict: "id" });
}

export interface RemoteProfile {
  profile: Profile;
  context: UserContext;
  updatedAt: string | null;
}

export async function loadProfile(userId: string): Promise<RemoteProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!data) return null;
  return {
    profile: { name: data.name, avatar: data.avatar },
    // normalize forever: old deploys keep writing RU strings to the cloud
    context: normalizeContext((data.context as UserContext) ?? { mood: null, people: null, time: null, genres: [] }),
    updatedAt: (data as { updated_at?: string }).updated_at ?? null,
  };
}

// ─── Saved items: merge-sync (upsert + targeted deletes) ─────────────────────

export async function syncSaved(userId: string, saved: Card[]) {
  if (!supabase) return;
  if (saved.length) {
    await supabase.from("saved_items").upsert(
      saved.map((c) => ({ user_id: userId, card_id: c.id, card_data: c as unknown as Record<string, unknown> })),
      { onConflict: "user_id,card_id", ignoreDuplicates: false }
    );
    // remove remotely only what the user explicitly removed locally
    await supabase
      .from("saved_items")
      .delete()
      .eq("user_id", userId)
      .not("card_id", "in", `(${saved.map((c) => c.id).join(",")})`);
  } else {
    await supabase.from("saved_items").delete().eq("user_id", userId);
  }
}

export async function loadSaved(userId: string): Promise<Card[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("saved_items").select("card_data").eq("user_id", userId);
  return (data ?? []).map((r) => normalizeCard(r.card_data as unknown as Card));
}

export async function updateComment(userId: string, cardId: number, comment: string) {
  if (!supabase) return;
  await supabase
    .from("saved_items")
    .update({ comment })
    .eq("user_id", userId)
    .eq("card_id", cardId);
}

// ─── Swipe history: append-only merge-sync keyed by record_id ────────────────

export async function syncHistory(userId: string, history: SwipeRecord[]) {
  if (!supabase || !history.length) return;
  await supabase.from("swipe_history").upsert(
    history.map((h) => ({
      user_id: userId,
      record_id: h.id,
      card_id: h.card.id,
      card_data: h.card as unknown as Record<string, unknown>,
      direction: h.dir,
      created_at: h.at,
    })),
    { onConflict: "user_id,record_id", ignoreDuplicates: true }
  );
}

export async function loadHistory(userId: string): Promise<SwipeRecord[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("swipe_history")
    .select("record_id, card_data, direction, created_at")
    .eq("user_id", userId)
    .order("created_at");
  return normalizeHistory(
    (data ?? []).map((r) => ({
      id: r.record_id as string,
      at: r.created_at as string,
      card: r.card_data as unknown as Card,
      dir: r.direction as SwipeRecord["dir"],
    })) as SwipeRecord[]
  );
}

// Union of local and remote histories: remote wins on duplicate record ids,
// result ordered by timestamp so the recommender's decay stays correct.
export function mergeHistories(local: SwipeRecord[], remote: SwipeRecord[]): SwipeRecord[] {
  const byId = new Map<string, SwipeRecord>();
  for (const rec of local) byId.set(rec.id, rec);
  for (const rec of remote) byId.set(rec.id, rec);
  return [...byId.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
