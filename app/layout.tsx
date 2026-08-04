import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./components/Providers";
import SiteFooter from "./components/SiteFooter";
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "PS Stats - PlayStation Gaming Analytics",
  description: "Explore your PlayStation gaming journey, trophy progress, playtime, and gaming habits.",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen flex flex-col"
      >
        <Providers>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
