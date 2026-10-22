// 登入方法。Supabase 後台需先啟用對應 Provider，並在 Auth → URL Configuration
// 加入 Redirect URL：http://localhost:3000/auth/callback 與你的 Vercel 網域。
import { supabase } from "./supabase";

const callback = () => `${location.origin}/auth/callback`;

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  if (error) throw error;
}

// ⚠ Supabase 沒有內建 Instagram Provider。這裡以同屬 Meta 的 Facebook 登入代替，
//   按鈕文案建議改為「Facebook / Instagram」。若一定要 IG 登入，需自建 Meta OAuth 流程。
export async function signInWithInstagram() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "facebook", options: { redirectTo: callback(), scopes: "email" },
  });
  if (error) throw error;
}

// 台灣手機 0912345678 → +886912345678
export const toE164 = (p: string) => "+886" + p.replace(/^0/, "");

export async function sendPhoneOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
  if (error) throw error;
}
export async function verifyPhoneOtp(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone: toE164(phone), token, type: "sms" });
  if (error) throw error;
}
export const signOut = () => supabase.auth.signOut();
