import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const assetBase = process.env.GITHUB_ACTIONS ? "/RotaOS" : "";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.GITHUB_ACTIONS ? "https://daiened.github.io/RotaOS/" : "https://rotaos-planejamento.daieneduarte.chatgpt.site/"),
  title: "RotaOS — Rotas, produção e equipes",
  description: "Planeje rotas, revise ordens de serviço e organize a produção das equipes em um único fluxo.",
  openGraph: {
    title: "RotaOS — Rotas, produção e equipes",
    description: "Planeje rotas, revise ordens de serviço e organize a produção das equipes em um único fluxo.",
    images: [{ url: `${assetBase}/og.png`, width: 1536, height: 1024, alt: "RotaOS — Rotas, produção e equipes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RotaOS — Rotas, produção e equipes",
    description: "Planeje rotas, revise ordens de serviço e organize a produção das equipes em um único fluxo.",
    images: [`${assetBase}/og.png`],
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
