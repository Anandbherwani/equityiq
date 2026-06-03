import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { PersonaProvider } from "@/components/shared/persona-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Indian Stock Intelligence — Equity Research Terminal",
  description:
    "Bloomberg-style Indian equity research — recommendations, conviction, fundamentals, and peer comparison powered by your research engine.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const theme = jar.get("isi_theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <PersonaProvider>
          <AppShell>{children}</AppShell>
        </PersonaProvider>
      </body>
    </html>
  );
}
