import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import UserAdminRow from "@/components/UserAdminRow";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const session = await getServerSession(authOptions);
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { nom: "asc" } });

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Rôles, statut de compte et rattachement service — modifiable en direct." />

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="px-4 py-3">Collaborateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Service</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserAdminRow key={u.id} user={u} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
