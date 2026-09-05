import type { Metadata, Viewport } from "next";
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
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import InstallPrompt from "@/components/pwa/InstallPrompt";

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
  applicationName: "FidiCard",
  manifest: "/manifest.webmanifest",
  // Sans ces trois-là, l'installation depuis iOS est dégradée : icône
  // générique, barre de navigateur conservée, pas de plein écran.
  appleWebApp: {
    capable: true,
    title: "FidiCard",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    // iOS transforme spontanément les nombres en liens d'appel. Un compteur
    // « 7/10 » devenu bouton téléphone, c'est un scan perdu.
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2B1E1A",
  width: "device-width",
  initialScale: 1,
  // L'application occupe l'écran jusque sous l'encoche et la barre gestuelle.
  // Les marges de sécurité sont reprises en CSS avec env(safe-area-inset-*).
  viewportFit: "cover",
  // Le double-tap qui zoome transforme un bouton manqué en page de travers.
  // On garde le pincement, qui reste un besoin d'accessibilité réel.
  maximumScale: 5,
  userScalable: true,
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
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
        <InstallPrompt />
      </body>
    </html>
  );
}
