import "./globals.css";
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

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
