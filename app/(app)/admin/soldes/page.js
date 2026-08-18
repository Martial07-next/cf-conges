import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import BalanceEditor from "@/components/BalanceEditor";

export const dynamic = "force-dynamic";

export default async function SoldesPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const [users, leaveTypes] = await Promise.all([
    prisma.user.findMany({ where: { statutCompte: { not: "DESACTIVE" } }, orderBy: { nom: "asc" } }),
    prisma.leaveType.findMany({ where: { comptabiliseSolde: true }, orderBy: { ordre: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Soldes de congés" subtitle="Ajustez les jours acquis / déjà pris — utile pour les CP déjà posés avant la mise en place de l'outil." />
      <BalanceEditor users={users} leaveTypes={leaveTypes} />
    </div>
  );
}
