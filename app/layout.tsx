import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "五份每日观察",
  description: "五个 ChatGPT 计划任务的手机阅读版与 RSS 订阅。",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
