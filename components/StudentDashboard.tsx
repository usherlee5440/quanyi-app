"use client";
// 學員 / 家長端。無本地 import（資料以 props 注入），可直接預覽；page.tsx 會傳入真實的 getHallOfFame。
import { useEffect, useState } from "react";
import { Award, Lock, Star, ShoppingBag, CalendarPlus, X, Plus, Minus, CheckCircle2, Trophy } from "lucide-react";

type HallRow = { display_name: string; total_hours: number; rank_tier: string };
type Props = { loadHall?: () => Promise<HallRow[]> };

// 學員資料表尚未建立，以下為示範資料
const BADGES = [
  { name: "跳繩", level: 3, got: true, bg: "from-cyan-400 to-blue-600", glow: "shadow-cyan-400/50" },
  { name: "籃球運球", level: 2, got: true, bg: "from-amber-300 to-orange-500", glow: "shadow-amber-400/50" },
  { name: "舞台表演", level: 1, got: true, bg: "from-fuchsia-400 to-purple-600", glow: "shadow-fuchsia-400/50" },
  { name: "團隊領導", level: 0, got: false, bg: "", glow: "" },
];
const DEMO_HALL: HallRow[] = [
  { display_name: "陳大文", total_hours: 4200, rank_tier: "partner" },
  { display_name: "林教練", total_hours: 1800, rank_tier: "senior" },
  { display_name: "張雅婷", total_hours: 1650, rank_tier: "senior" },
];
const RANK: Record<string, { label: string; stars: number }> = {
  rookie: { label: "入門教練", stars: 2 }, junior: { label: "初級教練", stars: 3 },
  senior: { label: "進階教練", stars: 4 }, partner: { label: "合夥人", stars: 5 },
};
const AVATAR = ["bg-cyan-500", "bg-fuchsia-500", "bg-amber-500"];
const CAMPS = ["暑假・運動體能營", "暑假・舞台表演營", "暑假・籃球技巧營"];
const ITEMS = [
  { id: "rope", name: "競速跳繩", price: 280 }, { id: "ball", name: "訓練籃球", price: 650 },
  { id: "cone", name: "敏捷訓練標誌桶組", price: 420 },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="關閉" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function StudentDashboard({ loadHall }: Props) {
  const [hall, setHall] = useState<HallRow[]>(DEMO_HALL);
  const [live, setLive] = useState(false);
  const [modal, setModal] = useState<"camp" | "store" | null>(null);
  // 報名表單
  const [kid, setKid] = useState(""); const [camp, setCamp] = useState(CAMPS[0]); const [phone, setPhone] = useState("");
  const [err, setErr] = useState(""); const [sent, setSent] = useState(false);
  // 商城
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    let on = true;
    loadHall?.().then(r => { if (on && r.length) { setHall(r.slice(0, 3)); setLive(true); } }).catch(() => {});
    return () => { on = false; };
  }, [loadHall]);

  const close = () => { setModal(null); setSent(false); setErr(""); };
  const submit = () => {
    if (!kid.trim()) return setErr("請輸入學員姓名");
    if (!/^09\d{8}$/.test(phone)) return setErr("請輸入 10 碼手機號碼");
    setErr(""); setSent(true);   // TODO: 串接報名資料表後，在此寫入 Supabase
  };
  const qty = (id: string, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));
  const total = ITEMS.reduce((s, i) => s + i.price * (cart[i.id] ?? 0), 0);
  const field = "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-600 focus:outline-none";

  return (
    <div className="space-y-6">
      {/* 學習歷程 */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-600 p-5 text-white">
        <p className="text-sm text-cyan-100">小宇的學習歷程</p>
        <p className="mt-1 text-sm text-cyan-100">累積實教時數</p>
        <p className="text-4xl font-black tabular-nums">86 <span className="text-lg font-medium">小時</span></p>
        <div className="mt-4 h-3 rounded-full bg-white/25" role="progressbar" aria-valuenow={86} aria-valuemax={120} aria-label="距離下一階段進度">
          <div className="h-3 rounded-full bg-white" style={{ width: "72%" }} />
        </div>
        <p className="mt-2 text-sm text-cyan-50">86 / 120 小時，再 34 小時晉級「初級結訓證書」</p>
      </section>

      {/* 技能徽章（深色底讓發光更明顯） */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-bold text-white">小宇的技能徽章</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {BADGES.map(b => (
            <div key={b.name} className={`rounded-2xl p-4 text-center ${b.got ? `bg-gradient-to-br ${b.bg} text-white shadow-xl ${b.glow}` : "border-2 border-dashed border-slate-600 text-slate-500"}`}>
              <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${b.got ? "bg-white/25 ring-4 ring-white/30" : "bg-slate-800"}`}>
                {b.got ? <Award size={28} /> : <Lock size={24} />}
              </div>
              <p className="mt-3 font-bold">{b.name}</p>
              {b.got ? (
                <>
                  <p className="text-sm font-semibold">Lv{b.level}</p>
                  <div className="mt-1 flex justify-center gap-1" aria-label={`等級 ${b.level}`}>
                    {[1, 2, 3].map(i => <span key={i} className={`h-1.5 w-5 rounded-full ${i <= b.level ? "bg-white" : "bg-white/30"}`} />)}
                  </div>
                </>
              ) : <p className="text-sm">尚未解鎖</p>}
            </div>
          ))}
        </div>
      </section>

      {/* 名人堂 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Trophy size={20} className="text-amber-500" /> 名師與英雄榜</h2>
          {!live && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">示範資料</span>}
        </div>
        <ul className="space-y-3">
          {hall.map((c, i) => {
            const r = RANK[c.rank_tier] ?? RANK.rookie;
            const initial = c.display_name.startsWith("代號") ? "C" : c.display_name.charAt(0);
            return (
              <li key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${AVATAR[i % 3]}`}>{initial}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{c.display_name}</p>
                  <p className="truncate text-sm text-slate-500">{r.label}・累計帶課 {c.total_hours.toLocaleString()} 小時</p>
                </div>
                <div className="flex text-amber-400" aria-label={`${r.stars} 星`}>
                  {Array.from({ length: 5 }, (_, k) => <Star key={k} size={14} fill={k < r.stars ? "currentColor" : "none"} />)}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 報名與商城 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setModal("camp")} className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 font-bold text-white shadow-lg shadow-blue-700/30 hover:bg-blue-800">
          <CalendarPlus size={20} /> 報名暑假營隊</button>
        <button onClick={() => setModal("store")} className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-700 px-5 py-4 font-bold text-blue-700 hover:bg-blue-50">
          <ShoppingBag size={20} /> 選購教學器材</button>
      </div>

      {modal === "camp" && (
        <Modal title="報名暑假營隊" onClose={close}>
          {sent ? (
            <div className="py-6 text-center">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <p className="mt-3 font-bold text-slate-900">已收到 {kid} 的報名！</p>
              <p className="mt-1 text-sm text-slate-500">（示範流程，尚未寫入資料庫）</p>
              <button onClick={close} className="mt-4 rounded-xl bg-blue-700 px-6 py-2 font-semibold text-white">完成</button>
            </div>
          ) : (
            <div className="space-y-3">
              <input className={field} placeholder="學員姓名" value={kid} onChange={e => setKid(e.target.value)} aria-label="學員姓名" />
              <select className={field} value={camp} onChange={e => setCamp(e.target.value)} aria-label="營隊">
                {CAMPS.map(c => <option key={c}>{c}</option>)}
              </select>
              <input className={field} inputMode="numeric" maxLength={10} placeholder="家長手機 0912345678" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} aria-label="家長手機" />
              {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
              <button onClick={submit} className="w-full rounded-xl bg-blue-700 py-3 font-bold text-white hover:bg-blue-800">送出報名</button>
            </div>
          )}
        </Modal>
      )}

      {modal === "store" && (
        <Modal title="教學器材商城" onClose={close}>
          <ul className="divide-y divide-slate-100">
            {ITEMS.map(i => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="font-semibold text-slate-900">{i.name}</p><p className="text-sm text-slate-500">${i.price}（示範商品）</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => qty(i.id, -1)} aria-label={`減少 ${i.name}`} className="rounded-lg border border-slate-300 p-1.5"><Minus size={14} /></button>
                  <span className="w-5 text-center tabular-nums text-slate-900">{cart[i.id] ?? 0}</span>
                  <button onClick={() => qty(i.id, 1)} aria-label={`增加 ${i.name}`} className="rounded-lg bg-blue-700 p-1.5 text-white"><Plus size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="font-bold text-slate-900">合計 ${total.toLocaleString()}</span>
            <button disabled={total === 0} onClick={close} className="rounded-xl bg-blue-700 px-5 py-2 font-bold text-white disabled:opacity-40">加入購物車</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
