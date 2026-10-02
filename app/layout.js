import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Plateforme de Congé - CF Réseaux",
  description: "Gestion des congés et du planning d'équipe - CF Réseaux",
  manifest: "/manifest.json",
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
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
