import "./globals.css";
import Providers from "@/components/Providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  const theme = session?.user?.theme || "clair";

  return (
    <html lang="fr" className={theme === "sombre" ? "dark" : ""}>
      <body className="font-sans">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
