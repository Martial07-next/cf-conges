import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import AdminLeaveEntryForm from "@/components/AdminLeaveEntryForm";
import ManualEntryList from "@/components/ManualEntryList";

export const dynamic = "force-dynamic";

export default async function SoldesPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const [users, leaveTypes, entries] = await Promise.all([
    prisma.user.findMany({ where: { statutCompte: { not: "DESACTIVE" } }, orderBy: { nom: "asc" } }),
    prisma.leaveType.findMany({ orderBy: { ordre: "asc" } }),
    prisma.leaveRequest.findMany({
      where: { creeParAdmin: true },
      include: { leaveType: true, user: true },
      orderBy: { dateDebut: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Congés déjà pris" subtitle="Ajoutez rétroactivement, avec les vraies dates, les congés pris avant la mise en place de l'outil." />
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <AdminLeaveEntryForm users={users} leaveTypes={leaveTypes} />
      </div>
      <ManualEntryList entries={entries} />
    </div>
  );
}
