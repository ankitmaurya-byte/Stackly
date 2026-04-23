import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../app/monaco-env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Stackly — Format and share code snippets",
  description:
    "Stackly formats and shares code snippets with syntax highlighting, across language channels.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[var(--color-bg-base)] text-[var(--color-text)]`}
      >
        {children}
      </body>
    </html>
  );
}
