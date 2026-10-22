// 讀取資料（寫入一律走 lib/coachActions.ts 的 RPC）
import { supabase } from "./supabase";

export type Rank = "rookie" | "junior" | "senior" | "partner";
export type CoachRow = {
  id: string; coach_code: string; rank_tier: Rank; current_exp: number; training_points: number;
  total_hours: number; status: "active" | "retired" | "terminated"; subdomain_url: string | null; line_official_id: string | null;
};
export type HofRow = { coach_code: string | null; display_name: string; total_hours: number; show_profile: boolean; rank_tier: Rank };
export type CatalogRow = { id: string; name: string; cost: number; min_rank: Rank; requires: string | null };
export type Overview = { fees_total: number; fees_this_month: number; fees_last_month: number; coaches_active: number; coaches_total: number };
export type AdminCoach = { id: string; code: string; name: string; status: CoachRow["status"]; hours: number };

function unwrap<T>(r: { data: unknown; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function getMyCoach() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return unwrap<CoachRow | null>(await supabase.from("coach_profiles").select("*").eq("id", user.id).maybeSingle());
}
export const getMyUnlocks = async () => unwrap<{ skill_id: string }[]>(await supabase.from("skill_tree_unlocks").select("skill_id"));
export const getSkillCatalog = async () => unwrap<CatalogRow[]>(await supabase.from("skill_catalog").select("*").order("cost"));
// 讀取去識別化後的名人堂 View（退役/交惡教練不含代號與 id）
export const getHallOfFame = async () => unwrap<HofRow[]>(await supabase.from("hall_of_fame").select("*"));

// ---- 管理者 ----
export const getAdminOverview = async () => unwrap<Overview>(await supabase.rpc("admin_overview"));
export async function getAdminCoaches(): Promise<AdminCoach[]> {
  const rows = unwrap<{ id: string; coach_code: string; status: CoachRow["status"]; total_hours: number; profiles: unknown }[]>(
    await supabase.from("coach_profiles").select("id, coach_code, status, total_hours, profiles(full_name)").order("total_hours", { ascending: false }));
  return rows.map(r => {
    const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as { full_name: string | null } | null;
    return { id: r.id, code: r.coach_code, name: p?.full_name ?? "（未填姓名）", status: r.status, hours: r.total_hours };
  });
}
export async function setCoachStatus(coachId: string, status: CoachRow["status"]) {
  unwrap<null>(await supabase.rpc("admin_set_coach_status", { p_coach: coachId, p_status: status }));
}
