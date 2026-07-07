import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/AppProviders";

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dibujarte - Sistema de Inventario",
  description: "Sistema de gestión de inventario para Dibujarte Editores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--surface-muted)] text-[var(--ink)] font-sans">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
