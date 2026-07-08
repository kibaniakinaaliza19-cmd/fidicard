import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Poppins,
  Montserrat,
  Playfair_Display,
  Lato,
  Roboto,
  Open_Sans,
  Great_Vibes,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700", "900"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700", "900"] });
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"] });
const greatVibes = Great_Vibes({ variable: "--font-great-vibes", subsets: ["latin"], weight: "400" });

const editorFontVars = [poppins, montserrat, playfair, lato, roboto, openSans, greatVibes]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "FidiCard Studio",
  description: "Créez et personnalisez vos cartes de fidélité digitales.",
};

const themeInitScript = `
try {
  var t = localStorage.getItem('fidicard-theme');
  if (t === 'light' || t === 'dark') {
    document.documentElement.setAttribute('data-theme', t);
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${editorFontVars} h-full antialiased`}
    >
      <body className="min-h-full">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
