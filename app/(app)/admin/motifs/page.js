import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import MotifsManager from "@/components/MotifsManager";

export const dynamic = "force-dynamic";

export default async function MotifsPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const [leaveTypes, motifs] = await Promise.all([
    prisma.leaveType.findMany({ where: { demandable: true }, orderBy: { ordre: "asc" } }),
    prisma.leaveTypeMotif.findMany({ orderBy: { ordre: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Motifs à durée fixe"
        subtitle="Événements familiaux (ASA) et autres motifs dont la durée est imposée automatiquement."
      />
      <MotifsManager leaveTypes={leaveTypes} initialMotifs={motifs} />
    </div>
  );
}
