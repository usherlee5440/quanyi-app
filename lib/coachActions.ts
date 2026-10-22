// 教練動作（寫入）：全部走資料庫 RPC，在單一交易內完成並由伺服端驗證。
//
// 參數說明：為了符合呼叫端簽名，函式保留 coachId / feeAmount / requiredPoints，
// 但「金額與費用不會被信任」——
//   • coachId        只用來確認等於目前登入者（防止誤用）；資料庫實際以登入 token 的 auth.uid() 為準
//   • feeAmount      僅供呼叫端顯示用；實際規費由資料庫依教練階級計算（入門300/初級200/進階100）
//   • requiredPoints 僅供呼叫端顯示用；實際費用取自資料庫 skill_catalog
// 若讓前端決定金額，任何人都能在瀏覽器主控台幫自己發點數。
import { supabase } from "./supabaseClient";
import type { CoachRow } from "./api";

export { getHallOfFame } from "./api"; // 讀取 hall_of_fame 去識別化視圖

async function callRpc(fn: string, args: Record<string, unknown>): Promise<CoachRow> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);              // 例：點數不足、階級未達、需先解鎖前置技能
  return (Array.isArray(data) ? data[0] : data) as CoachRow;
}

async function assertSelf(coachId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== coachId) throw new Error("只能操作自己的教練帳號");
}

/** 報帳 / 完成一堂課：寫入 points_ledger，同步更新 EXP(+50)、培訓點數、教學時數(+1)、階級。回傳最新教練資料。 */
export async function addPassFeeAction(coachId: string, _feeAmount: number, description = "課務回繳") {
  await assertSelf(coachId);
  return callRpc("add_lesson_fee", { p_description: description });
}

/** 解鎖技能：資料庫檢查階級/前置技能/點數 → 扣除 training_points → 寫入 skill_tree_unlocks。回傳最新教練資料。 */
export async function unlockSkillAction(coachId: string, skillId: string, _requiredPoints?: number) {
  await assertSelf(coachId);
  return callRpc("unlock_skill", { p_skill_id: skillId });
}
