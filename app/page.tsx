"use client";
// 路由分流：未登入 → LoginPage；已登入 → 依 profiles.role 顯示對應入口
import "./shine.css";
import { LogOut, Repeat } from "lucide-react";
import { useAuth, type Role } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import CoachDashboard from "@/components/CoachDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import { getHallOfFame } from "@/lib/api";

const LABEL: Record<Role, string> = { student: "家長 / 學員", coach: "教練", admin: "經營管理者" };

export default function Home() {
  const { profile, loading, displayName, effectiveRole, canSwitch, setViewAs, logout } = useAuth();

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">載入中…</main>;
  // 未登入，或 admin 尚未選擇要檢視的入口
  if (!profile || !effectiveRole) return <LoginPage session={profile ? { name: displayName } : null} onPickRole={setViewAs} />;

  return (
    <main className={`min-h-screen ${effectiveRole === "coach" ? "bg-slate-950" : "bg-slate-100"}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950 px-4 py-3 text-white">
        <div><p className="font-bold">全藝 NEXT U</p><p className="text-xs text-cyan-300">{LABEL[effectiveRole]}・{displayName}</p></div>
        <div className="flex gap-2">
          {canSwitch && <button onClick={() => setViewAs(null)} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"><Repeat size={16} /> 切換入口</button>}
          <button onClick={logout} aria-label="登出" className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><LogOut size={16} /></button>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-4">
        {effectiveRole === "student" && <StudentDashboard loadHall={getHallOfFame} />}
        {effectiveRole === "coach" && <CoachDashboard />}
        {effectiveRole === "admin" && <AdminDashboard />}
      </div>
    </main>
  );
}
