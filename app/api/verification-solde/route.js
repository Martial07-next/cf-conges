import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { motif, soldeDeclareN, soldeDeclareN1 } = await req.json();
  const solde = await calculerSoldeCP(prisma, session.user.id);
  const auteur = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { prenom: true, nom: true, dateEntree: true },
  });

  const campagneN = solde.annee;
  const finCampagneN1 = new Date(campagneN, 4, 31, 23, 59, 59, 999);
  const aDroitsN1 = !!auteur?.dateEntree && auteur.dateEntree <= finCampagneN1;

  const demande = await prisma.verificationSolde.create({
    data: {
      userId: session.user.id,
      soldeAffiche: solde.disponible,
      soldeDeclareN: soldeDeclareN !== undefined && soldeDeclareN !== "" ? Number(soldeDeclareN) : null,
      soldeDeclareN1: aDroitsN1 && soldeDeclareN1 !== undefined && soldeDeclareN1 !== "" ? Number(soldeDeclareN1) : null,
      motif: motif || null,
    },
  });

  await logAudit(session.user.id, "VERIFICATION_SOLDE_DEMANDEE", `solde affiché : ${solde.disponible} j`);

  const responsables = await prisma.user.findMany({
    where: {
      role: { in: ["EMPLOYEUR", "ADMIN"] },
      statutCompte: "ACTIF",
    },
  });
  for (const responsable of responsables) {
    await notify(
      responsable.id,
      "Vérification de solde",
      `${auteur.prenom} ${auteur.nom} signale une possible erreur de solde CP (N affiché : ${solde.disponible} j).`
    );
  }

  return NextResponse.json(demande, { status: 201 });
}
