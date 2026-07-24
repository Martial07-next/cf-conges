import "./globals.css";
import Providers from "@/components/Providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Congés — CF Réseaux",
  description: "Gestion des congés et du planning d'équipe — CF Réseaux",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="fr">
      <body className="font-sans">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
