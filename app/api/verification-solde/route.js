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

  const { motif } = await req.json();
  const solde = await calculerSoldeCP(prisma, session.user.id);

  const demande = await prisma.verificationSolde.create({
    data: { userId: session.user.id, soldeAffiche: solde.disponible, motif: motif || null },
  });

  await logAudit(session.user.id, "VERIFICATION_SOLDE_DEMANDEE", `solde affiché : ${solde.disponible} j`);

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", statutCompte: "ACTIF" } });
  const auteur = await prisma.user.findUnique({ where: { id: session.user.id } });
  for (const a of admins) {
    await notify(a.id, "Vérification de solde", `${auteur.prenom} ${auteur.nom} demande une vérification de son solde (affiché : ${solde.disponible} j).`);
  }

  return NextResponse.json(demande, { status: 201 });
}
