import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import ProfileForm from "@/components/ProfileForm";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: { teletravailOverrides: { orderBy: { date: "asc" } } },
});

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon profil" subtitle="Informations personnelles et préférences de notification." />
      <ProfileForm user={user} />
      <Card className="p-6 mt-6">
        <h2 className="font-bold text-brand-dark dark:text-brand-cream mb-1">Apparence</h2>
        <p className="text-xs text-brand-dark/50 dark:text-brand-cream/50 mb-4">Choisis l'affichage clair ou sombre de la plateforme.</p>
        <ThemeToggle themeActuel={user.theme} />
      </Card>
      <Card className="p-6 mt-6">
        <h2 className="font-bold text-brand-dark dark:text-brand-cream mb-1">Notifications sur cet appareil</h2>
        <p className="text-xs text-brand-dark/50 dark:text-brand-cream/50 mb-4">
          Reçois une alerte directement sur ton téléphone dès qu'une demande de congé est soumise.
        </p>
        <PushNotificationToggle role={user.role} />
      </Card>
    </div>
  );
}
