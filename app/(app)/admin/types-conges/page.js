import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import BandeauPage from "@/components/BandeauPage";
import AdminNav from "@/components/AdminNav";
import LeaveTypeManager from "@/components/LeaveTypeManager";

export const dynamic = "force-dynamic";

export default async function TypesCongesPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const types = await prisma.leaveType.findMany({ orderBy: { ordre: "asc" } });

  return (
    <div>
      <BandeauPage icone="types" titre="Types de congés" sousTitre="Codes, couleurs, plafonds et règles entièrement paramétrables" />
      <AdminNav actif="/admin/types-conges" estAdmin={session.user.role === "ADMIN"} />
      <LeaveTypeManager initialTypes={types} />
    </div>
  );
}
