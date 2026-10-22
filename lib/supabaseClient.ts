// Supabase Client 初始化（單例）。實際建立在 lib/supabase.ts，這裡以你指定的檔名對外匯出，
// 讓整個專案只會有一個連線實例。
export { supabase } from "./supabase";
export { supabase as default } from "./supabase";
