import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Count On",
  description: "Pengeluaran dan tabungan bersama",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Count On",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#7FA894",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8F4EF] text-[#2F2C2A]">{children}</body>
    </html>
  );
}
