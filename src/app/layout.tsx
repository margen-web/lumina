import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lumina-app-drab.vercel.app"),
  title: "Lumina - 5 Noticias Positivas",
  description: "Una dosis diaria de optimismo para empezar tu día con calma y positividad.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lumina",
  },
  openGraph: {
    title: "Lumina - 5 Noticias Positivas",
    description: "Una dosis diaria de optimismo para empezar tu día con calma y positividad.",
    type: "website",
    locale: "es_ES",
    url: "https://lumina-app-drab.vercel.app",
    siteName: "Lumina",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina - 5 Noticias Positivas",
    description: "Una dosis diaria de optimismo para empezar tu día con calma y positividad.",
  },
};

export const viewport: Viewport = {
  themeColor: "#facc15",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-full bg-[var(--background)]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
