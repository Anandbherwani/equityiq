import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { PersonaProvider } from "@/components/shared/persona-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
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
        className={`${inter.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}
      >
        <PersonaProvider>
          <AppShell>{children}</AppShell>
        </PersonaProvider>
      </body>
    </html>
  );
}
