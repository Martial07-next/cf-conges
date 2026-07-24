import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon profil" subtitle="Informations personnelles et préférences de notification." />
      <ProfileForm user={user} />
    </div>
  );
}
