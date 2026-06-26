import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
// @ts-expect-error CSS imports are handled by Next.js
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SoundSwipe — Swipe. Listen. Build.",
  description:
    "A studio-grade audio asset library. Swipe through short sound effects, save your favorites, and upload your own clips under 10 seconds.",
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-background">
      <body
        className={`${inter.className} bg-background text-foreground overflow-hidden antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
