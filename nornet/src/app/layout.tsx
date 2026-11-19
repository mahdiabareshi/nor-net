import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./nrt.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "نورنت — حساب کاربری و کیف پول",
  description: "دمو پروژه فروش کانفیگ با ساخت خودکار؛ شارژ کیف پول با کارت‌به‌کارت و تأیید رسید (نسخه نمایشی رزومه).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06030f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="nrt-theme antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
