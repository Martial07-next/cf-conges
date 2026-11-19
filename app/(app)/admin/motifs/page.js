import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import BandeauPage from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
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
      <BandeauPage icone="demande" titre="Motifs à durée fixe" sousTitre="Événements familiaux (ASA) et autres motifs dont la durée est imposée automatiquement" />
      <AdminNav actif="/admin/motifs" estAdmin={session.user.role === "ADMIN"} />
      <MotifsManager leaveTypes={leaveTypes} initialMotifs={motifs} />
    </div>
  );
}
