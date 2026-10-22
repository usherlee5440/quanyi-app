// 瀏覽器端 Supabase 客戶端（@supabase/ssr 會把登入狀態存在 cookie，配合 OAuth 回呼）
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
