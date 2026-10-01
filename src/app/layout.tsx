import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LinkStation",
  description: "Plataforma SaaS de gestión de llamadas IA, agendamiento y contactabilidad para cualquier tipo de negocio",
  icons: {
    icon: [
      { url: "/favicon-ls.svg", type: "image/svg+xml" },
      { url: "/favicon-ls.png", sizes: "32x32" },
    ],
    shortcut: "/favicon-ls.svg",
    apple: "/favicon-ls.png",
  },
};

import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { SkipLink } from "@/components/layout/SkipLink";
import Script from "next/script";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('ui-theme');
                const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (theme !== 'light' && supportDarkMode)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} bg-background text-foreground font-sans antialiased`}>
        {/* Sprint 3 SP-4-WCAG-10: skip-link al inicio del body (WCAG 2.4.1 Bypass Blocks). */}
        <SkipLink />
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
