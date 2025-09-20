import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invoice Manager Pro | Professional Dashboard",
  description: "Advanced invoice management dashboard with Kanban workflow and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased dashboard-bg relative`}
      >
        <div className="fixed inset-0 pointer-events-none paper-texture" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
