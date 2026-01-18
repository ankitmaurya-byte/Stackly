import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '../app/monaco-env';
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CodeShare - Format and Share Code Snippets",
  description: "A developer-focused web app for formatting and sharing code snippets with syntax highlighting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
