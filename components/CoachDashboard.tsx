"use client";
// 教練模組：遊戲化儀表板。只用標準 Tailwind 類別 + lucide-react，無外部圖片，可直接預覽。
// 已串接 Supabase：資料讀取見 lib/api.ts，寫入走 lib/coachActions.ts（RPC，伺服端驗證）
import { useCallback, useEffect, useRef, useState } from "react";
import { getMyCoach, getMyUnlocks, getSkillCatalog, getHallOfFame, type CoachRow, type CatalogRow, type HofRow, type Rank } from "@/lib/api";
import { addPassFeeAction, unlockSkillAction } from "@/lib/coachActions";
import { useAuth } from "@/context/AuthContext";
import { DEMO_COACH, DEMO_CATALOG, DEMO_HALL_ROWS, demoAddLesson } from "@/lib/demoData";
import {
  Trophy, Coins, Clock, Plus, Sparkles, Lock, CheckCircle2, Copy, Check,
  ShieldCheck, Play, Crown, Zap, Link2, FileText, Video, ChevronDown,
} from "lucide-react";

const RANK_LABEL: Record<Rank, string> = { rookie: "入門教練", junior: "初級教練", senior: "進階教練", partner: "合夥人" };
const RANK_FEE: Record<Rank, number> = { rookie: 300, junior: 200, senior: 100, partner: 0 };   // 與資料庫 add_lesson_fee 一致，僅供顯示
const NEXT_EXP: Record<Rank, number> = { rookie: 1500, junior: 6000, senior: 20000, partner: 20000 };
const RANK_IDX: Rank[] = ["rookie", "junior", "senior", "partner"];
const EXP_PER_LESSON = 50;
const SKILL_DESC: Record<string, string> = {
  performance_choreography: "舞台動線與課程編舞", market_bd: "開發新學校與安親班案源",
  social_marketing: "經營個人品牌與招生內容", business_mgmt: "團隊管理與區域營運",
};
type SkillState = "done" | "ready" | "locked";
const CROWN = ["text-amber-300", "text-slate-300", "text-orange-400"];
const VIDEOS = [
  { id: 1, title: "跳繩基礎教學示範", len: "12:40" },
  { id: 2, title: "低年級課堂帶動技巧", len: "08:15" },
  { id: 3, title: "營隊成果發表紀錄", len: "21:03" },
];
const CSS = `
@keyframes popUp{0%{opacity:0;transform:translateY(12px) scale(.9)}20%{opacity:1;transform:translateY(0) scale(1.05)}80%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
@keyframes shine{0%{transform:translateX(-120%) skewX(-20deg)}60%,100%{transform:translateX(320%) skewX(-20deg)}}
.pop-up{animation:popUp 1.6s ease-out forwards}
.btn-shine{position:relative;overflow:hidden}
.btn-shine::after{content:"";position:absolute;inset:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);animation:shine 2.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.pop-up{animation:none;opacity:1}.btn-shine::after{display:none}}`;

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-5 shadow-lg shadow-cyan-500/10">
    <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-cyan-300">{title}</h2>{children}
  </section>
);

export default function CoachDashboard() {
  const { isDemo } = useAuth();   // 模擬登入時改用示範資料，不呼叫資料庫
  const [coach, setCoach] = useState<CoachRow | null>(null);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [board, setBoard] = useState<HofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lessons, setLessons] = useState(0);
  const [pops, setPops] = useState<{ id: number; text: string; cls: string }[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [video, setVideo] = useState(1);
  const [desc, setDesc] = useState("");
  const uid = useRef(0);

  // 載入真實資料：教練數據、技能目錄、已解鎖技能、英雄榜
  const load = useCallback(async () => {
    if (isDemo) {
      setCoach(DEMO_COACH); setCatalog(DEMO_CATALOG); setUnlocked(["performance_choreography"]); setBoard(DEMO_HALL_ROWS); setLoading(false);
      return;
    }
    try {
      const [c, cat, un, hof] = await Promise.all([getMyCoach(), getSkillCatalog(), getMyUnlocks(), getHallOfFame()]);
      setCoach(c); setCatalog(cat); setUnlocked(un.map(u => u.skill_id)); setBoard(hof);
    } catch (e) { setMsg(e instanceof Error ? e.message : "載入失敗"); }
    finally { setLoading(false); }
  }, [isDemo]);
  useEffect(() => { load(); }, [load]);

  // 新增一堂課：資料庫算好點數/經驗/升階後回傳最新資料
  const addLesson = async () => {
    if (!coach || busy) return;
    setBusy(true); setMsg("");
    try {
      const next = isDemo ? demoAddLesson(coach) : await addPassFeeAction(coach.id, RANK_FEE[coach.rank_tier], desc.trim() || "課務回繳");
      setDesc("");
      const dp = next.training_points - coach.training_points, de = next.current_exp - coach.current_exp;
      setCoach(next); setLessons(n => n + 1);
      const a = { id: ++uid.current, text: `獲得 +${dp} 培訓點數`, cls: "bg-amber-300 text-slate-900" };
      const b = { id: ++uid.current, text: `獲得 +${de} EXP`, cls: "bg-fuchsia-400 text-slate-900" };
      setPops(p => [...p, a, b]);
      setTimeout(() => setPops(p => p.filter(x => x.id !== a.id && x.id !== b.id)), 1600);
      if (next.rank_tier !== coach.rank_tier) setMsg(`恭喜晉升為${RANK_LABEL[next.rank_tier]}！`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "操作失敗"); }
    finally { setBusy(false); }
  };

  const unlock = async (id: string) => {
    if (!coach || busy) return;
    setBusy(true); setMsg("");
    try {
      const cost = catalog.find(c => c.id === id)?.cost ?? 0;
      if (isDemo && coach.training_points < cost) throw new Error("點數不足");
      const next = isDemo ? { ...coach, training_points: coach.training_points - cost } : await unlockSkillAction(coach.id, id, cost);
      setCoach(next); setUnlocked(u => [...u, id]);
      setMsg(`已解鎖「${catalog.find(c => c.id === id)?.name ?? id}」`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "解鎖失敗"); }   // 例：點數不足
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText("https://" + URL_TEXT); } catch { /* 部分環境不支援 */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="rounded-2xl bg-slate-950 p-10 text-center text-slate-300">載入教練資料中…</div>;
  if (!coach) return <div className="rounded-2xl bg-slate-950 p-10 text-center text-slate-300">找不到教練資料，請聯絡管理者開通教練身份。{msg && <p className="mt-2 text-sm text-rose-300">{msg}</p>}</div>;

  const points = coach.training_points, exp = coach.current_exp, hours = coach.total_hours;
  const code = coach.coach_code;
  const expMax = NEXT_EXP[coach.rank_tier];
  const fee = RANK_FEE[coach.rank_tier];
  const URL_TEXT = coach.subdomain_url ?? `usherlee.com/coach/${code}`;
  const lineOn = !!coach.line_official_id;
  const myRank = board.findIndex(b => b.coach_code === code) + 1 || null;
  const skills = catalog.map(c => {
    const done = unlocked.includes(c.id);
    const rankOk = RANK_IDX.indexOf(coach.rank_tier) >= RANK_IDX.indexOf(c.min_rank);
    const reqOk = !c.requires || unlocked.includes(c.requires);
    const state: SkillState = done ? "done" : rankOk && reqOk ? "ready" : "locked";
    const lockNote = !rankOk ? `需${RANK_LABEL[c.min_rank]}階級` : `需先解鎖${catalog.find(x => x.id === c.requires)?.name ?? "前置技能"}`;
    return { id: c.id, name: c.name, desc: SKILL_DESC[c.id] ?? "", cost: c.cost, state, lockNote };
  });
  const pct = Math.min(100, Math.round((exp / expMax) * 100));

  return (
    <div className="space-y-5 rounded-2xl bg-slate-950 p-4 text-white">
      <style>{CSS}</style>

      {/* 1. 狀態卡 */}
      <section className="relative overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-slate-900 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-5 shadow-xl shadow-fuchsia-500/20">
        <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-2xl font-black text-slate-950 ring-4 ring-cyan-300/40">{code.slice(-2)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-fuchsia-200">教練代號 {code.toUpperCase()}</p>
            <p className="text-2xl font-black">{RANK_LABEL[coach.rank_tier]}</p>
          </div>
          <div className="rounded-xl border border-amber-300/40 bg-black/30 px-4 py-2 text-center">
            <Trophy className="mx-auto text-amber-300" size={18} />
            <p className="text-2xl font-black">#{myRank ?? "—"}</p>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold text-fuchsia-200">EXP</span>
            <span className="tabular-nums text-slate-200">{exp.toLocaleString()} / {expMax.toLocaleString()}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-black/50" role="progressbar" aria-valuenow={exp} aria-valuemin={0} aria-valuemax={expMax}>
            <div className="h-4 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-400 to-cyan-300 shadow-lg shadow-fuchsia-500/60 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">{exp >= expMax ? "已達進階教練升階門檻！" : `距離進階教練還差 ${(expMax - exp).toLocaleString()} EXP`}</p>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-300/30 bg-black/30 p-4">
            <p className="flex items-center gap-1.5 text-xs text-amber-200"><Coins size={14} /> 培訓點數</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-amber-300">{points.toLocaleString()}<span className="ml-1 text-base font-bold">Pts</span></p>
          </div>
          <div className="rounded-xl border border-cyan-300/30 bg-black/30 p-4">
            <p className="flex items-center gap-1.5 text-xs text-cyan-200"><Clock size={14} /> 實教總時數</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-cyan-300">{hours}<span className="ml-1 text-base font-bold">小時</span></p>
          </div>
        </div>
      </section>

      {/* 2. 規費轉點數模擬器 */}
      <Panel title="過手規費 → 點數 模擬器">
        <p className="mb-3 text-sm text-slate-300">{RANK_LABEL[coach.rank_tier]}每堂回繳 ${fee} 行政費，自動 1:1 換算成培訓點數。</p>
        <input value={desc} onChange={e => setDesc(e.target.value)} maxLength={60} aria-label="課務說明" placeholder="課務說明，例如：光復國小體育社團" className="mb-3 w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none" />
        <div className="relative">
          <button onClick={addLesson} disabled={busy} className="disabled:opacity-60 btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-4 text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:brightness-110 active:scale-95">
            <Plus size={22} /> 報帳 / 完成一堂課（發放過手費 ${fee}）
          </button>
          <div className="pointer-events-none absolute inset-x-0 -top-2 flex flex-col items-center gap-1" aria-live="polite">
            {pops.map(p => <span key={p.id} className={`pop-up rounded-full px-4 py-1 text-sm font-black shadow-lg ${p.cls}`}>{p.text}</span>)}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">本次已新增 <b className="text-white">{lessons}</b> 堂，累計 +{(lessons * fee).toLocaleString()} 點、+{lessons * EXP_PER_LESSON} EXP</p>
      </Panel>

      {/* 3. 技能樹 */}
      <Panel title="技能樹">
        {msg && <p role="status" className="mb-3 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">{msg}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {skills.map(s => {
            const tone = s.state === "done" ? "border-emerald-400/50 bg-emerald-400/10"
              : s.state === "ready" ? "border-amber-300/60 bg-amber-300/10 shadow-lg shadow-amber-300/20"
              : "border-slate-700 bg-slate-800/50";
            return (
              <div key={s.id} className={`rounded-xl border p-4 ${tone}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-bold ${s.state === "locked" ? "text-slate-400" : "text-white"}`}>{s.name}</p>
                    <p className="text-sm text-slate-400">{s.desc}</p>
                  </div>
                  {s.state === "done" && <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-bold text-emerald-300"><CheckCircle2 size={12} /> 已解鎖</span>}
                  {s.state === "ready" && <span className="shrink-0 rounded-full bg-amber-300/20 px-2 py-0.5 text-xs font-bold text-amber-300">可解鎖</span>}
                  {s.state === "locked" && <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300"><Lock size={12} /> 未達階級</span>}
                </div>

                {s.state === "done" && (
                  <>
                    <button onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="mt-3 flex items-center gap-1 text-sm font-semibold text-emerald-300">
                      查看教學內容 <ChevronDown size={16} className={open === s.id ? "rotate-180" : ""} />
                    </button>
                    {open === s.id && (
                      <div className="mt-2 flex gap-2">
                        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-400/20 py-2 text-sm text-emerald-200"><Video size={15} /> 教學影片</button>
                        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-400/20 py-2 text-sm text-emerald-200"><FileText size={15} /> 講義</button>
                      </div>
                    )}
                  </>
                )}
                {s.state === "ready" && (
                  <button onClick={() => unlock(s.id)} disabled={busy} className="disabled:opacity-60 btn-shine mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-300 to-orange-400 py-2.5 font-black text-slate-900 active:scale-95">
                    <Sparkles size={16} /> 立即解鎖（{s.cost} 點）
                  </button>
                )}
                {s.state === "locked" && <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400"><Lock size={14} /> {s.lockNote}（{s.cost} 點）</p>}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 4. 數位資產工具箱 */}
      <Panel title="數位資產工具箱">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-black/30 p-3">
            <Link2 size={18} className="shrink-0 text-cyan-300" />
            <span className="min-w-0 flex-1 truncate text-sm text-cyan-100">{URL_TEXT}</span>
            <button onClick={copy} className="flex shrink-0 items-center gap-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-bold text-slate-950 active:scale-95">
              {copied ? <><Check size={14} /> 已複製</> : <><Copy size={14} /> 複製</>}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${lineOn ? "animate-pulse bg-emerald-400 shadow-lg shadow-emerald-400/70" : "bg-rose-500"}`} />
              <div><p className="text-sm font-bold">官方 LINE 專線</p>
                <p className={`flex items-center gap-1 text-xs ${lineOn ? "text-emerald-300" : "text-rose-300"}`}><ShieldCheck size={12} /> {lineOn ? "已安全監護" : "尚未綁定"}</p></div>
            </div>
            
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">YouTube 教學紀錄播放清單</p>
            {/* 正式版：以 <iframe src="https://www.youtube.com/embed/videoseries?list=播放清單ID" /> 取代下方預覽 */}
            <div className="grid aspect-video place-items-center rounded-xl bg-gradient-to-br from-indigo-900 to-slate-800">
              <div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/50"><Play size={24} fill="white" /></span>
                <p className="mt-2 px-3 text-sm font-semibold">{VIDEOS.find(v => v.id === video)!.title}</p></div>
            </div>
            <ul className="mt-2 space-y-1">
              {VIDEOS.map(v => (
                <li key={v.id}><button onClick={() => setVideo(v.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${video === v.id ? "bg-cyan-400/20 text-cyan-100" : "text-slate-300 hover:bg-white/5"}`}>
                  <span>{v.id}. {v.title}</span><span className="text-xs text-slate-400">{v.len}</span></button></li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {/* 5. 英雄榜 */}
      <Panel title="全服英雄榜">
        <ul className="space-y-2">
          {board.slice(0, 3).map((b, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-black/30 px-4 py-3">
              <Crown size={20} className={CROWN[i]} />
              <span className="w-6 font-black">{i + 1}</span>
              <span className="flex-1 font-semibold">{b.display_name}</span>
              <span className="text-sm tabular-nums text-slate-300">{b.total_hours.toLocaleString()} 小時</span>
            </li>
          ))}
          <li className="flex items-center gap-3 rounded-xl border border-fuchsia-400/60 bg-fuchsia-500/10 px-4 py-3 shadow-lg shadow-fuchsia-500/20">
            <Zap size={20} className="text-fuchsia-300" />
            <span className="w-6 font-black">{myRank ?? "—"}</span>
            <span className="flex-1 font-semibold">你（{code.toUpperCase()}）</span>
            <span className="text-sm tabular-nums text-fuchsia-200">{hours} 小時</span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
