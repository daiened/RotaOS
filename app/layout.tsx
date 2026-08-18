import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const assetBase = process.env.GITHUB_ACTIONS ? "/RotaOS" : "";
const siteBase = process.env.GITHUB_ACTIONS
  ? "https://daiened.github.io/RotaOS/"
  : process.env.NEXT_PUBLIC_ROTAOS_ENV === "development"
    ? "https://rotaos-dev.daieneduarte.chatgpt.site/"
    : "https://rotaos-planejamento.daieneduarte.chatgpt.site/";

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
  title: "RotaOS — Planejamento inteligente de rotas",
  description: "Sincronize ordens de serviço, identifique alterações e revise sugestões de rota para cada equipe.",
  openGraph: {
    title: "RotaOS — Planejamento inteligente de rotas",
    description: "Rotas inteligentes, revisão humana.",
    images: [{ url: `${assetBase}/og-sync.png`, width: 1536, height: 1024, alt: "RotaOS — Rotas inteligentes, revisão humana" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RotaOS — Planejamento inteligente de rotas",
    description: "Rotas inteligentes, revisão humana.",
    images: [`${assetBase}/og-sync.png`],
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
