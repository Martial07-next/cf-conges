import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import BandeauPage from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
import AjustementSoldeForm from "@/components/AjustementSoldeForm";
import AdminLeaveEntryForm from "@/components/AdminLeaveEntryForm";
import ManualEntryList from "@/components/ManualEntryList";

export const dynamic = "force-dynamic";

export default async function SoldesPage() {
  const session = await getServerSession(authOptions);
  const employeurRH = session?.user?.role === "EMPLOYEUR";
  if (!employeurRH && !canAccess(session?.user, "admin")) redirect("/dashboard");

  const [users, leaveTypes, entries] = await Promise.all([
    prisma.user.findMany({ where: { statutCompte: { not: "DESACTIVE" } }, orderBy: { nom: "asc" } }),
    prisma.leaveType.findMany({ orderBy: { ordre: "asc" } }),
    prisma.leaveRequest.findMany({
      where: { creeParAdmin: true },
      include: { leaveType: true, user: true, valideur: { select: { id: true, prenom: true, nom: true } } },
      orderBy: { dateDebut: "desc" },
    }),
  ]);

  return (
    <div>
      <BandeauPage icone="solde" titre="Congés & soldes" sousTitre="Congés déjà pris (saisie rétroactive) et ajustements manuels de solde" />
      <AdminNav actif="/admin/soldes" employeurRH={employeurRH} estAdmin={session.user.role === "ADMIN"} />
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <AdminLeaveEntryForm users={users} leaveTypes={leaveTypes} />
        <AjustementSoldeForm users={users} />
      </div>
      <ManualEntryList entries={entries} restrictPastDeletion={employeurRH} currentUserId={employeurRH ? session.user.id : null} />
    </div>
  );
}
