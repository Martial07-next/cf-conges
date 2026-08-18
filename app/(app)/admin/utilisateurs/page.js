import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import UserAdminRow from "@/components/UserAdminRow";
import CreateUserForm from "@/components/CreateUserForm";
import UsersFilterBar from "@/components/UsersFilterBar";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const tri = searchParams?.tri === "desc" ? "desc" : "asc";
  const service = searchParams?.service || "";

  const users = await prisma.user.findMany({
    where: service ? { service } : undefined,
    orderBy: { nom: tri },
  });

  const servicesBruts = await prisma.user.findMany({
    select: { service: true },
    distinct: ["service"],
  });
  const services = servicesBruts
    .map((s) => s.service)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Rôles, statut de compte et rattachement service — modifiable en direct." />

      <CreateUserForm />

      <UsersFilterBar tri={tri} service={service} services={services} />

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-brand-dark/50 border-b border-black/5">
              <th className="px-4 py-3">Collaborateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date D'entrée</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Accès</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-brand-dark/50">
                  Aucun collaborateur pour ce filtre.
                </td>
              </tr>
            ) : (
              users.map((u) => <UserAdminRow key={u.id} user={u} />)
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
