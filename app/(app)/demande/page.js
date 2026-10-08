import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import RequestForm from "@/components/RequestForm";

export const dynamic = "force-dynamic";

export default async function DemandePage() {
  // Les comptes Employeur / RH ne posent pas de congés.
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "EMPLOYEUR") redirect("/dashboard");

  const leaveTypes = await prisma.leaveType.findMany({
    where: { demandable: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Nouvelle demande" subtitle="Type, dates, envoi." />
      <RequestForm leaveTypes={leaveTypes} />
    </div>
  );
}
