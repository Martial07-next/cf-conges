import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import LeaveTypeManager from "@/components/LeaveTypeManager";

export const dynamic = "force-dynamic";

export default async function TypesCongesPage() {
  const session = await getServerSession(authOptions);
  if (!canAccess(session.user, "admin")) redirect("/dashboard");

  const types = await prisma.leaveType.findMany({ orderBy: { ordre: "asc" } });

  return (
    <div>
      <PageHeader title="Types de congés" subtitle="Codes, couleurs, plafonds et règles — entièrement paramétrables." />
      <LeaveTypeManager initialTypes={types} />
    </div>
  );
}
