"use client";
import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ShieldAlert, Link2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_OVERVIEW, DEMO_ADMIN_COACHES } from "@/lib/demoData";
import { getAdminCoaches, getAdminOverview, getHallOfFame, setCoachStatus, type AdminCoach, type HofRow, type Overview, type CoachRow } from "@/lib/api";

const STATUS: Record<CoachRow["status"], { label: string; cls: string }> = {
  active: { label: "現役・顯示全名", cls: "bg-emerald-100 text-emerald-800" },
  retired: { label: "退役・顯示姓氏", cls: "bg-amber-100 text-amber-800" },
  terminated: { label: "交惡・顯示代號", cls: "bg-rose-100 text-rose-800" },
};
const money = (n: number) => `$${Number(n).toLocaleString()}`;
// 與資料庫 get_hall_of_fame() 相同規則，僅用於管理端即時預覽
const toHof = (list: AdminCoach[]): HofRow[] => list.map(c => ({ coach_code: c.status === "active" ? c.code : null, display_name: shown(c), total_hours: c.hours, show_profile: c.status === "active", rank_tier: "junior" }));
const shown = (c: AdminCoach) => c.status === "active" ? c.name : c.status === "retired" ? c.name.charAt(0) + "教練" : `代號 ${c.code.toUpperCase()}`;

export default function AdminDashboard() {
  const { isDemo } = useAuth();   // 模擬登入時使用示範資料
  const [ov, setOv] = useState<Overview | null>(null);
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [hof, setHof] = useState<HofRow[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemo) { setOv(DEMO_OVERVIEW); setCoaches(DEMO_ADMIN_COACHES); setHof(toHof(DEMO_ADMIN_COACHES)); return; }
    try {
      const [o, c, h] = await Promise.all([getAdminOverview(), getAdminCoaches(), getHallOfFame()]);
      setOv(o); setCoaches(c); setHof(h); setErr("");
    } catch (e) { setErr(e instanceof Error ? e.message : "載入失敗"); }
  }, [isDemo]);
  useEffect(() => { load(); }, [load]);

  const change = async (id: string, status: CoachRow["status"]) => {
    if (isDemo) { const next = coaches.map(c => c.id === id ? { ...c, status } : c); setCoaches(next); setHof(toHof(next)); return; }
    setBusy(id);
    try { await setCoachStatus(id, status); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "更新失敗"); }
    finally { setBusy(null); }
  };

  const delta = ov && ov.fees_last_month > 0 ? ((ov.fees_this_month - ov.fees_last_month) / ov.fees_last_month) * 100 : null;
  const turnover = ov && ov.coaches_total > 0 ? ((ov.coaches_total - ov.coaches_active) / ov.coaches_total) * 100 : 0;

  return (
    <div className="space-y-6">
      {err && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-800">{err}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs text-slate-400">本月過手規費</p>
          <p className="mt-1 text-2xl font-black tabular-nums md:text-3xl">{ov ? money(ov.fees_this_month) : "—"}</p>
          {delta !== null && (
            <p className={`mt-1 flex items-center gap-1 text-sm font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% 較上月
            </p>)}
        </div>
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs text-slate-400">累計過手規費</p>
          <p className="mt-1 text-2xl font-black tabular-nums md:text-3xl">{ov ? money(ov.fees_total) : "—"}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs text-slate-400">現役教練</p>
          <p className="mt-1 text-2xl font-black tabular-nums md:text-3xl">{ov ? `${ov.coaches_active} / ${ov.coaches_total}` : "—"}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs text-slate-400">教練流動率</p>
          <p className="mt-1 text-2xl font-black tabular-nums md:text-3xl">{ov ? `${turnover.toFixed(1)}%` : "—"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900"><ShieldAlert size={20} className="text-amber-500" /> 名人堂權限管理</h2>
        <p className="mb-4 text-sm text-slate-500">切換狀態後，前台名人堂立即改用對應顯示方式；歷史教學時數保留。</p>
        {coaches.length === 0 && <p className="text-sm text-slate-500">目前沒有教練資料。</p>}
        <ul className="divide-y divide-slate-100">
          {coaches.map(c => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-semibold text-slate-900">{c.name} <span className="text-xs text-slate-400">{c.code.toUpperCase()}</span></p>
                <p className="text-sm text-slate-500">前台顯示：{shown(c)}・{c.hours} 小時</p></div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                <select aria-label={`變更 ${c.name} 狀態`} value={c.status} disabled={busy === c.id} onChange={e => change(c.id, e.target.value as CoachRow["status"])}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800">
                  <option value="active">現役</option><option value="retired">退役</option><option value="terminated">交惡</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-slate-900">前台名人堂實際顯示（get_hall_of_fame）</h2>
        <ol className="space-y-2 text-sm">
          {hof.map((h, i) => (
            <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span>{i + 1}. {h.display_name}</span><span className="tabular-nums text-slate-500">{h.total_hours.toLocaleString()} 小時</span>
            </li>))}
        </ol>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <Link2 className="mt-0.5 shrink-0 text-blue-600" size={18} />
        子官網、LINE 官方帳號、YouTube 播放清單由平台統一持有，教練離職時可一鍵收回。
      </section>
    </div>
  );
}
