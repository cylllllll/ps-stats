import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./components/Providers";
import { Analytics } from "@vercel/analytics/next";

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
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className="font-sans antialiased min-h-screen flex flex-col"
      >
        <Providers>
          <div className="flex-1">{children}</div>
        </Providers>
        <footer className="border-t border-border/40 py-6 mt-auto">
          <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <a
              href="https://t.me/PlayStationNewssss"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              PlayStation 新闻转发
            </a>
            <span className="text-border">•</span>
            <span>Built with ❤️</span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
