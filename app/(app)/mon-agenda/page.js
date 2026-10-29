import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { dateFranceISO } from "@/lib/dateFrance";
import { estDirection, jourISO } from "@/lib/agendaDirection";
import AgendaEvenements from "@/components/AgendaEvenements";

export const dynamic = "force-dynamic";

// Agenda des Employeurs / RH et du pôle Direction : par défaut présent, on
// n'ajoute que les exceptions. L'équipe les voit dans le planning et
// « Équipe en direct ».
export default async function MonAgendaPage() {
  const session = await getServerSession(authOptions);
  if (!estDirection(session?.user)) redirect("/dashboard");

  const aujourdHui = dateFranceISO();
  const [evenements, lieux] = await Promise.all([
    prisma.agendaEvenement.findMany({
      where: { userId: session.user.id, dateFin: { gte: new Date(`${aujourdHui}T00:00:00.000Z`) } },
      orderBy: [{ dateDebut: "asc" }, { createdAt: "asc" }],
    }),
    prisma.agendaEvenement.findMany({
      where: { userId: session.user.id, lieu: { not: null } },
      select: { lieu: true },
      distinct: ["lieu"],
      take: 20,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Mon agenda"
        subtitle="Par défaut, vous êtes présent. Ajoutez seulement vos absences, télétravail, déplacements ou réunions : l'équipe les voit dans le planning."
      />
      <AgendaEvenements
        aujourdHui={aujourdHui}
        evenements={evenements.map((e) => ({
          id: e.id,
          statut: e.statut,
          debutISO: jourISO(e.dateDebut),
          finISO: jourISO(e.dateFin),
          demiJournee: e.demiJournee,
          periode: e.periode,
          lieu: e.lieu,
          note: e.note,
        }))}
        lieuxConnus={lieux.map((l) => l.lieu).filter(Boolean)}
      />
    </div>
  );
}
