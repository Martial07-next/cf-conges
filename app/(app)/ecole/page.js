import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AlternantSection, TuteurSection } from "@/components/EcoleManager";

export const dynamic = "force-dynamic";

export default async function EcolePage() {
  const session = await getServerSession(authOptions);
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });

  const estTuteur = await prisma.user.count({ where: { tuteurId: session.user.id } });
  if (!me.estAlternant && estTuteur === 0) redirect("/dashboard");

  const ec = await prisma.leaveType.findUnique({ where: { code: "ec" } });
  const couleur = ec?.couleur || "#63B3C9";

  const [entries, tuteurs, alternants] = await Promise.all([
    me.estAlternant
      ? prisma.leaveRequest.findMany({ where: { userId: me.id, gereParAlternant: true }, orderBy: { dateDebut: "desc" } })
      : [],
    me.estAlternant ? prisma.user.findMany({ where: { statutCompte: "ACTIF", id: { not: me.id } }, orderBy: { nom: "asc" } }) : [],
    estTuteur > 0
      ? prisma.user.findMany({
          where: { tuteurId: me.id },
          include: { leaveRequests: { where: { gereParAlternant: true }, orderBy: { dateDebut: "asc" } } },
          orderBy: { nom: "asc" },
        })
      : [],
  ]);

  return (
    <div>
      <PageHeader title="École" subtitle="Suivi des périodes école en alternance." />
      <div className="space-y-8">
        {me.estAlternant && <AlternantSection entries={entries} tuteurs={tuteurs} tuteurActuelId={me.tuteurId} couleur={couleur} />}
        {estTuteur > 0 && <TuteurSection alternants={alternants} couleur={couleur} />}
      </div>
    </div>
  );
}
