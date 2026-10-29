import "./globals.css";
import { Space_Grotesk, Archivo } from "next/font/google";
import Providers from "@/components/Providers";
import InitialBootScreen from "@/components/InitialBootScreen";

export const metadata = {
  title: "Plateforme de Congé - CF Réseaux",
  description: "Gestion des congés et du planning d'équipe - CF Réseaux",
  manifest: "/manifest.json",
  // Nom affiché sous l'icône une fois ajoutée à l'écran d'accueil (iPhone ;
  // Android utilise le short_name du manifest).
  applicationName: "CF CONGÉS",
  appleWebApp: { title: "CF CONGÉS" },
  icons: {
    icon: "/app-logo.png",
    apple: "/app-logo.png",
  },
};

export const viewport = {
  themeColor: "#6CB64D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Typographies CF Réseaux : Space Grotesk pour le texte, Archivo Expanded
// (Archivo en largeur 125 %) pour les titres. Servies par le site lui-même.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-space-grotesk" });
const archivo = Archivo({ subsets: ["latin"], display: "swap", axes: ["wdth"], variable: "--font-archivo" });

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${spaceGrotesk.variable} ${archivo.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("cf-theme");if(t==="sombre"){document.documentElement.classList.add("dark")}else if(t==="clair"){document.documentElement.classList.remove("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans bg-brand-cream dark:bg-brand-darker" style={{ margin: 0 }}>
        <InitialBootScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
