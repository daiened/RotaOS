import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const assetBase = process.env.GITHUB_ACTIONS ? "/RotaOS" : "";
const siteBase = "https://daiened.github.io/RotaOS/";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteBase),
  title: "RotaOS — Base completa e rotas inteligentes",
  description: "Base persistente de chamados, filtros, reclamações e sugestões de rota.",
  openGraph: {
    title: "RotaOS — Base completa e rotas inteligentes",
    description: "Base completa. Decisões melhores.",
    images: [{ url: `${assetBase}/og-grid.png`, width: 1536, height: 1024, alt: "RotaOS — Base completa. Decisões melhores." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RotaOS — Base completa e rotas inteligentes",
    description: "Base completa. Decisões melhores.",
    images: [`${assetBase}/og-grid.png`],
  },
  icons: {
    icon: `${assetBase}/favicon.svg`,
    shortcut: `${assetBase}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
