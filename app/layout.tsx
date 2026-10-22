// 若你的專案已有 layout.tsx（含字型設定），只要把 <AuthProvider> 包住 {children} 即可。
import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = { title: "全藝 NEXT U", description: "讓夢想成為事業" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
