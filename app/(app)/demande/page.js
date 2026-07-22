import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import RequestForm from "@/components/RequestForm";

export const dynamic = "force-dynamic";

export default async function DemandePage() {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { demandable: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Nouvelle demande" subtitle="Type, dates, envoi — en 3 clics." />
      <RequestForm leaveTypes={leaveTypes} />
    </div>
  );
}
