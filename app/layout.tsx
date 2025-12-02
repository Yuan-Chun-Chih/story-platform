import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import AnimatedBackground from "../components/AnimatedBackground"; // [新增]

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Story Forge | 線上共創故事平台",
  description:
    "與朋友一起共創故事、點讚互動，並用 AI 排名決定劇情走向的 Next.js 故事平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen text-slate-900 antialiased`}
      >
        <AnimatedBackground /> {/* [新增] 放在最底層 */}
        
        <Navbar />
        <main className="pb-12 relative">{children}</main> {/* relative 確保內容浮在背景上 */}
      </body>
    </html>
  );
}