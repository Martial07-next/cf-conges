import "./globals.css";
import Providers from "@/components/Providers";
import InitialBootScreen from "@/components/InitialBootScreen";

export const metadata = {
  title: "Plateforme de Congé - CF Réseaux",
  description: "Gestion des congés et du planning d'équipe - CF Réseaux",
  manifest: "/manifest.json",
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
    <html lang="fr" style={{ backgroundColor: "#F5F1E8" }}>
      <body className="font-sans" style={{ margin: 0, backgroundColor: "#F5F1E8" }}>
        <InitialBootScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
