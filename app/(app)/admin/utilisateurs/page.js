import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ORDRE_UTILISATEURS } from "@/lib/ordreUtilisateurs";
import { Card } from "@/components/ui";
import BandeauPage, { TuileChiffre } from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
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
  const statut = ["ACTIF", "EN_ATTENTE", "DESACTIVE"].includes(searchParams?.statut) ? searchParams.statut : "";

const tous = await prisma.user.findMany({
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

  // Les chiffres portent sur la recherche en cours ; un clic filtre par statut.
  const users = statut ? tous.filter((u) => u.statutCompte === statut) : tous;
  const actifs = tous.filter((u) => u.statutCompte === "ACTIF").length;
  const enAttente = tous.filter((u) => u.statutCompte === "EN_ATTENTE").length;
  const desactives = tous.filter((u) => u.statutCompte === "DESACTIVE").length;
  const lienStatut = (s) => {
    const params = new URLSearchParams();
    if (tri) params.set("tri", tri);
    if (service) params.set("service", service);
    if (recherche) params.set("q", recherche);
    if (s && s !== statut) params.set("statut", s);
    const qs = params.toString();
    return `/admin/utilisateurs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <BandeauPage
        icone="utilisateurs"
        titre="Utilisateurs"
        sousTitre={`${tous.length} compte${tous.length > 1 ? "s" : ""} · rôles, pôles, accès et visibilité`}
      >
        <CreateUserForm peutCreerAdmin={estAdmin} />
      </BandeauPage>
      <AdminNav actif="/admin/utilisateurs" employeurRH={employeurRH} estAdmin={estAdmin} />

      <div className="mb-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <TuileChiffre valeur={tous.length} label={recherche || service ? "selon la recherche" : "comptes au total"} couleur="#0afe6b" href={lienStatut("")} />
        <TuileChiffre valeur={actifs} label={statut === "ACTIF" ? "actifs · filtre actif ✕" : "actifs"} couleur="#16A34A" href={lienStatut("ACTIF")} />
        <TuileChiffre valeur={enAttente} label={statut === "EN_ATTENTE" ? "en attente · filtre actif ✕" : "en attente d’activation"} couleur="#9333EA" href={lienStatut("EN_ATTENTE")} />
        <TuileChiffre valeur={desactives} label={statut === "DESACTIVE" ? "désactivés · filtre actif ✕" : "désactivés"} couleur="#94A3B8" href={lienStatut("DESACTIVE")} />
      </div>

      <p className="mb-3 text-xs text-brand-dark/45">Les modifications sont enregistrées directement, collaborateur par collaborateur.</p>

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
