import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ORDRE_UTILISATEURS } from "@/lib/ordreUtilisateurs";
import { PageHeader, Card } from "@/components/ui";
import UserAdminRow from "@/components/UserAdminRow";
import CreateUserForm from "@/components/CreateUserForm";
import UsersFilterBar from "@/components/UsersFilterBar";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  const employeurRH = session?.user?.role === "EMPLOYEUR";
  const estAdmin = session?.user?.role === "ADMIN";
  const peutChangerRoles = canAccess(session?.user, "admin");
  if (!employeurRH && !canAccess(session?.user, "admin")) redirect("/dashboard");

  const tri = searchParams?.tri || ""; // "" = ordre manuel, "asc"/"desc" = tri par nom
  const service = searchParams?.service || "";
  const recherche = searchParams?.q?.trim() || "";
  const manuel = tri === "";

const users = await prisma.user.findMany({
  where: {
    ...(service ? { service } : {}),
    ...(recherche
      ? {
          OR: [
            { prenom: { contains: recherche, mode: "insensitive" } },
            { nom: { contains: recherche, mode: "insensitive" } },
            { email: { contains: recherche, mode: "insensitive" } },
          ],
        }
      : {}),
  },
  orderBy: manuel
    ? ORDRE_UTILISATEURS
    : { nom: tri },
});

  const servicesBruts = await prisma.user.findMany({
    select: { service: true },
    distinct: ["service"],
  });
  const services = servicesBruts
    .map((s) => s.service)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const actifs = users.filter((u) => u.statutCompte === "ACTIF").length;
  const enAttente = users.filter((u) => u.statutCompte === "EN_ATTENTE").length;
  const desactives = users.filter((u) => u.statutCompte === "DESACTIVE").length;

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Gérez les collaborateurs, leurs accès et leur organisation depuis un seul espace." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Affichés</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{users.length}</p>
          <p className="mt-0.5 text-xs text-brand-dark/45">{recherche || service ? "Selon les filtres actifs" : "Collaborateurs"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Actifs</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{actifs}</p>
          <p className="mt-0.5 text-xs text-brand-dark/45">Comptes accessibles</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">En attente</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{enAttente}</p>
          <p className="mt-0.5 text-xs text-brand-dark/45">À traiter</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/45">Désactivés</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{desactives}</p>
          <p className="mt-0.5 text-xs text-brand-dark/45">Sans accès</p>
        </Card>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-brand-dark">Gestion des collaborateurs</h2>
          <p className="mt-0.5 text-xs text-brand-dark/45">Les modifications sont enregistrées directement depuis chaque collaborateur.</p>
        </div>
        <CreateUserForm peutCreerAdmin={estAdmin} />
      </div>

      <UsersFilterBar tri={tri} service={service} services={services} recherche={recherche} />

      <Card className="overflow-x-auto border-black/[0.07] shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-brand-dark/45 border-b border-black/[0.07] bg-black/[0.015]">
              <th className="px-4 py-3">Collaborateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Date d'entrée</th>
              <th className="px-4 py-3">Accès</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-brand-dark/50">
                  Aucun collaborateur pour ce filtre.
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <UserAdminRow
                  key={u.id}
                  user={u}
                  reorderable={manuel && peutChangerRoles}
                  prevUserId={i > 0 ? users[i - 1].id : null}
                  nextUserId={i < users.length - 1 ? users[i + 1].id : null}
                  readOnly={employeurRH && u.role === "ADMIN"}
                  canManageAdminAccess={estAdmin}
                  roleVerrouille={!estAdmin && (!peutChangerRoles || u.id === session?.user?.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
