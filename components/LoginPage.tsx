"use client";
// 登入 + 身份選擇。目前為模擬流程：任何手機號碼、驗證碼 6 碼即通過。
// 正式串接 Supabase：
//   Google   → supabase.auth.signInWithOAuth({ provider: "google" })
//   手機 OTP → supabase.auth.signInWithOtp({ phone }) → verifyOtp({ phone, token, type: "sms" })
//   Instagram→ Supabase 無內建 Instagram，需自建 OAuth（Meta Login）或改用 Facebook provider
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaInstagram } from "react-icons/fa";
import { Smartphone, ArrowLeft, GraduationCap, Dumbbell, BarChart3, ShieldCheck, FlaskConical } from "lucide-react";
import { useAuth, type Role } from "@/context/AuthContext";

type Props = {
  session: { name: string } | null;
  onPickRole: (r: Role) => void;
};

const DEV_LABEL: Record<Role, string> = { student: "模擬登入為學員", coach: "模擬登入為教練", admin: "模擬登入為經營者" };

const ROLES: { id: Role; title: string; desc: string; Icon: typeof Dumbbell; tone: string }[] = [
  { id: "student", title: "我是家長 / 學員", desc: "查看徽章、學習歷程與報名課程", Icon: GraduationCap, tone: "from-cyan-400/30" },
  { id: "coach", title: "我是教練", desc: "經驗值、技能樹與課務日誌", Icon: Dumbbell, tone: "from-fuchsia-500/30" },
  { id: "admin", title: "我是經營管理者", desc: "營運數據、風控與名人堂權限", Icon: BarChart3, tone: "from-amber-400/30" },
];

export default function LoginPage({ session, onPickRole }: Props) {
  const { loginWithGoogle, loginWithInstagram, sendPhoneOTP, verifyPhoneOTP, devLogin } = useAuth();
  const [step, setStep] = useState<"choose" | "phone" | "otp">("choose");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 統一處理 loading / 錯誤；登入成功後 AuthContext 會自動收到狀態並切換畫面
  const run = async (fn: () => Promise<unknown>, next?: () => void) => {
    setBusy(true); setErr("");
    try { await fn(); next?.(); }
    catch (e) { setErr(e instanceof Error ? e.message : "發生錯誤，請稍後再試"); }
    finally { setBusy(false); }
  };
  const sendOtp = () => {
    if (!/^09\d{8}$/.test(phone)) return setErr("請輸入 10 碼手機號碼，例如 0912345678");
    run(() => sendPhoneOTP(phone), () => setStep("otp"));
  };
  const verify = () => {
    if (otp.length !== 6) return setErr("請輸入 6 位數驗證碼");
    run(() => verifyPhoneOTP(phone, otp));
  };

  const btn = "flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 font-medium text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50";
  const input = "w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3.5 text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2">
        {/* 品牌區 */}
        <div>
          <p className="text-sm font-semibold text-cyan-300">全藝 NEXT U 育才平台</p>
          <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight md:text-6xl">讓夢想<br />成為事業</h1>
          <p className="mt-5 max-w-sm text-slate-300">從小學技術，長大變事業。每一堂課、每一份付出，都會累積成你的等級與職涯。</p>
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400"><ShieldCheck size={16} /> 20 年基層教學經驗打造</div>
        </div>

        {/* 互動卡 */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur">
          {!session ? (
            <>
              {step !== "choose" && (
                <button onClick={() => { setStep("choose"); setErr(""); }} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                  <ArrowLeft size={16} /> 返回
                </button>
              )}
              {step === "choose" && (
                <div className="space-y-3">
                  <h2 className="mb-2 text-xl font-bold">登入或註冊</h2>
                  <button className={btn} disabled={busy} onClick={() => run(loginWithGoogle)}><FcGoogle size={22} /> 使用 Google 繼續</button>
                  <button className={btn} disabled={busy} onClick={() => run(loginWithInstagram)}><FaInstagram size={22} className="text-pink-400" /> 使用 Facebook / Instagram 繼續</button>
                  <button className={btn} onClick={() => setStep("phone")}><Smartphone size={20} className="text-cyan-300" /> 使用手機號碼繼續</button>
                </div>
              )}
              {step === "phone" && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold">輸入手機號碼</h2>
                  <input className={input} inputMode="numeric" maxLength={10} placeholder="0912345678" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} aria-label="手機號碼" />
                  <button onClick={sendOtp} disabled={busy} className="w-full rounded-xl bg-cyan-400 py-3.5 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "發送中…" : "發送簡訊驗證碼"}</button>
                </div>
              )}
              {step === "otp" && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold">輸入驗證碼</h2>
                  <p className="text-sm text-slate-400">已發送至 {phone}（原型模式：輸入任意 6 碼）</p>
                  <input className={`${input} text-center text-2xl tracking-widest`} inputMode="numeric" maxLength={6} placeholder="••••••" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} aria-label="簡訊驗證碼" autoFocus />
                  <button onClick={verify} disabled={busy} className="w-full rounded-xl bg-cyan-400 py-3.5 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "驗證中…" : "驗證並登入"}</button>
                </div>
              )}
              {err && <p role="alert" className="mt-3 text-sm text-rose-400">{err}</p>}
            </>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">歡迎，{session.name}</h2>
              <p className="text-sm text-slate-400">請選擇你的身份，之後可隨時切換。</p>
              {ROLES.map(({ id, title, desc, Icon, tone }) => (
                <button key={id} onClick={() => onPickRole(id)} className={`flex w-full items-center gap-4 rounded-xl border border-white/10 bg-gradient-to-r ${tone} to-transparent p-4 text-left transition hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300`}>
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10"><Icon size={22} /></span>
                  <span><span className="block font-bold">{title}</span><span className="text-sm text-slate-300">{desc}</span></span>
                </button>
              ))}
            </div>
          )}

          {/* 開發測試區塊：僅 NEXT_PUBLIC_DEV_LOGIN=true 時顯示，正式環境不會出現 */}
          {devLogin && !session && (
            <div className="mt-5 rounded-xl border border-dashed border-amber-300/60 bg-amber-300/5 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold text-amber-300"><FlaskConical size={14} /> 開發測試（不會建立真實登入，使用示範資料）</p>
              <div className="grid grid-cols-3 gap-2">
                {(["student", "coach", "admin"] as Role[]).map(r => (
                  <button key={r} onClick={() => devLogin(r)} className="rounded-lg bg-amber-300/15 px-2 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">{DEV_LABEL[r]}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
