"use client";
// 全站登入狀態：user + profile(role)，並提供登入/登出方法。
// 角色以資料庫 profiles.role 為準；admin 可用 setViewAs 切換檢視其他入口。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import * as auth from "@/lib/auth";

export type Role = "student" | "coach" | "admin";
export type Profile = { id: string; role: Role; full_name: string | null; phone: string | null; avatar_url: string | null };

type Ctx = {
  user: User | null; profile: Profile | null; loading: boolean;
  displayName: string;
  effectiveRole: Role | null;            // 一般用戶=自己的角色；admin=目前檢視的入口（未選為 null）
  canSwitch: boolean; setViewAs: (r: Role | null) => void;
  loginWithGoogle: () => Promise<void>; loginWithInstagram: () => Promise<void>;
  sendPhoneOTP: (phone: string) => Promise<void>; verifyPhoneOTP: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>; refreshProfile: () => Promise<void>;
  isDemo: boolean;                      // 目前是否為「模擬登入」（僅開發測試）
  devLogin?: (r: Role) => void;         // 僅 NEXT_PUBLIC_DEV_LOGIN=true 時存在
};
// 開發測試開關：正式環境請勿設定此變數，否則任何人都能「模擬登入」看到示範畫面
const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewAs, setViewAs] = useState<Role | null>(null);
  const [demoRole, setDemoRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (!u) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("id, role, full_name, phone, avatar_url").eq("id", u.id).maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshProfile();
    // 回呼內不可直接 await supabase 呼叫（官方建議），延後一個 tick
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(refreshProfile, 0); });
    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  const value = useMemo<Ctx>(() => {
    // 模擬登入：不建立真實 Supabase 登入，資料庫仍受 RLS 保護；各 Dashboard 會改用示範資料
    const demoOn = DEV_LOGIN && demoRole !== null;
    const prof: Profile | null = demoOn
      ? { id: "demo", role: demoRole as Role, full_name: "測試使用者（模擬）", phone: null, avatar_url: null }
      : profile;
    const isAdmin = prof?.role === "admin";
    return {
      user, profile: prof, loading: demoOn ? false : loading, refreshProfile, isDemo: demoOn,
      canSwitch: demoOn || isAdmin,
      setViewAs: (r) => (demoOn ? setDemoRole(r) : setViewAs(r)),
      displayName: prof?.full_name || (prof?.phone ? `***${prof.phone.slice(-3)}` : "使用者"),
      effectiveRole: prof ? (demoOn ? demoRole : isAdmin ? viewAs : prof.role) : null,
      loginWithGoogle: auth.signInWithGoogle,
      loginWithInstagram: auth.signInWithInstagram,
      sendPhoneOTP: auth.sendPhoneOtp,
      verifyPhoneOTP: auth.verifyPhoneOtp,
      devLogin: DEV_LOGIN ? (r: Role) => setDemoRole(r) : undefined,
      logout: async () => { setDemoRole(null); setViewAs(null); if (!demoOn) await auth.signOut(); },
    };
  }, [user, profile, loading, viewAs, demoRole, refreshProfile]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth 必須在 <AuthProvider> 內使用");
  return c;
}
