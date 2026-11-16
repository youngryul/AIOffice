import type { Metadata } from "next";
import { Jua } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/** 제목/버튼용 동글동글 손글씨 느낌 폰트 */
const jua = Jua({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-jua" });

export const metadata: Metadata = {
  title: { default: "AI Office", template: "%s · AI Office" },
  description: "AI 직원들이 조사하고, 토론하고, 결재를 올리는 나만의 AI 회사",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-right" toastOptions={{ style: { borderRadius: "1rem", borderWidth: 2 } }} />
      </body>
    </html>
  );
}
