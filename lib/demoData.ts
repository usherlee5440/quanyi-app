// 開發測試用「模擬登入」的示範資料（不會寫入資料庫）。僅在 NEXT_PUBLIC_DEV_LOGIN=true 時使用。
import type { CoachRow, CatalogRow, HofRow, Overview, AdminCoach } from "./api";

export const DEMO_COACH: CoachRow = {
  id: "demo", coach_code: "ch-08", rank_tier: "junior", current_exp: 1840, training_points: 3200,
  total_hours: 412, status: "active", subdomain_url: null, line_official_id: "@demo",
};
export const DEMO_CATALOG: CatalogRow[] = [
  { id: "performance_choreography", name: "表演編排", cost: 300, min_rank: "rookie", requires: null },
  { id: "market_bd", name: "市場開發", cost: 800, min_rank: "junior", requires: "performance_choreography" },
  { id: "social_marketing", name: "社群行銷", cost: 1500, min_rank: "junior", requires: "market_bd" },
  { id: "business_mgmt", name: "經營管理", cost: 3000, min_rank: "senior", requires: null },
];
export const DEMO_HALL_ROWS: HofRow[] = [
  { coach_code: "ch-01", display_name: "陳大文", total_hours: 4200, show_profile: true, rank_tier: "partner" },
  { coach_code: null, display_name: "林教練", total_hours: 1800, show_profile: false, rank_tier: "senior" },
  { coach_code: null, display_name: "代號 CH-07", total_hours: 1650, show_profile: false, rank_tier: "senior" },
  { coach_code: "ch-08", display_name: "測試使用者（模擬）", total_hours: 412, show_profile: true, rank_tier: "junior" },
];
export const DEMO_OVERVIEW: Overview = { fees_total: 1286000, fees_this_month: 286000, fees_last_month: 254000, coaches_active: 24, coaches_total: 29 };
export const DEMO_ADMIN_COACHES: AdminCoach[] = [
  { id: "d1", code: "ch-01", name: "陳大文", status: "active", hours: 4200 },
  { id: "d2", code: "ch-05", name: "林明哲", status: "retired", hours: 1800 },
  { id: "d3", code: "ch-07", name: "王小明", status: "terminated", hours: 1650 },
];

/** 模擬新增一堂課（與資料庫 add_lesson_fee 規則一致：規費依階級、+50 EXP、+1 小時、自動升階） */
export function demoAddLesson(c: CoachRow): CoachRow {
  const fee = { rookie: 300, junior: 200, senior: 100, partner: 0 }[c.rank_tier];
  const exp = c.current_exp + 50;
  const order = ["rookie", "junior", "senior", "partner"] as const;
  const byExp = exp >= 20000 ? "partner" : exp >= 6000 ? "senior" : exp >= 1500 ? "junior" : "rookie";
  const rank = order.indexOf(byExp) > order.indexOf(c.rank_tier) ? byExp : c.rank_tier;
  return { ...c, training_points: c.training_points + fee, current_exp: exp, total_hours: c.total_hours + 1, rank_tier: rank };
}
