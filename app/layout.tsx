import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-expect-error CSS imports are handled by Next.js
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FoleySwipe",
  description: "B2B Audio Asset Library",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-white overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}