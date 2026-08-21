import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// DELETE : retire un seul jour d'une période école existante — raccourcit la
// période si le jour est en début/fin, la découpe en deux si le jour est au
// milieu, ou la supprime entièrement si elle ne couvrait que ce jour-là.
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "Date obligatoire." }, { status: 400 });

  const jour = new Date(date);

  const entry = await prisma.leaveRequest.findFirst({
    where: {
      userId: session.user.id,
      gereParAlternant: true,
      dateDebut: { lte: jour },
      dateFin: { gte: jour },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Aucun jour école trouvé à cette date." }, { status: 404 });
  }

  const memeJourDebut = entry.dateDebut.toDateString() === jour.toDateString();
  const memeJourFin = entry.dateFin.toDateString() === jour.toDateString();

  if (memeJourDebut && memeJourFin) {
    await prisma.leaveRequest.delete({ where: { id: entry.id } });
  } else if (memeJourDebut) {
    const nouveauDebut = new Date(jour);
    nouveauDebut.setDate(nouveauDebut.getDate() + 1);
    await prisma.leaveRequest.update({ where: { id: entry.id }, data: { dateDebut: nouveauDebut } });
  } else if (memeJourFin) {
    const nouvelleFin = new Date(jour);
    nouvelleFin.setDate(nouvelleFin.getDate() - 1);
    await prisma.leaveRequest.update({ where: { id: entry.id }, data: { dateFin: nouvelleFin } });
  } else {
    const finPremiereMoitie = new Date(jour);
    finPremiereMoitie.setDate(finPremiereMoitie.getDate() - 1);
    const debutSecondeMoitie = new Date(jour);
    debutSecondeMoitie.setDate(debutSecondeMoitie.getDate() + 1);

    await prisma.$transaction([
      prisma.leaveRequest.update({ where: { id: entry.id }, data: { dateFin: finPremiereMoitie } }),
      prisma.leaveRequest.create({
        data: {
          userId: entry.userId,
          leaveTypeId: entry.leaveTypeId,
          dateDebut: debutSecondeMoitie,
          dateFin: entry.dateFin,
          statut: "VALIDE",
          motif: entry.motif,
          gereParAlternant: true,
        },
      }),
    ]);
  }

  await logAudit(session.user.id, "ECOLE_JOUR_RETIRE", date);
  return NextResponse.json({ ok: true });
}
