import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calculerSoldeCP } from "@/lib/moteurConges";
import { arrondi2 } from "@/lib/campagneConges";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// POST : ajustement manuel trace du solde d'un collaborateur, pour une
// campagne donnee. Jamais une ecrasement - toujours un ajout (+ ou -) avec
// motif obligatoire, lu par lib/moteurConges.js dans le calcul du solde.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

    const { userId, annee, valeurCible, motif } = await req.json();
  if (!userId || !annee || valeurCible === undefined || !motif || motif.trim().length < 3) {
    return NextResponse.json({ error: "Collaborateur, campagne, valeur cible et motif (obligatoire) sont requis." }, { status: 400 });
  }

  // "Ecrase" le solde disponible : calcule l'ecart necessaire entre la
  // valeur actuelle (deja calculee par le moteur, ajustements precedents
  // inclus) et la valeur voulue, puis stocke CET ecart - jamais la valeur
  // brute - pour garder une trace complete et coherente avec le moteur.
  const soldeActuel = await calculerSoldeCP(prisma, userId, new Date());
  const soldeCampagne = Number(annee) === soldeActuel.campagne ? soldeActuel : soldeActuel.n1;
  const ecart = arrondi2(Number(valeurCible) - soldeCampagne.disponible);

  const ajustement = await prisma.leaveBalanceAdjustment.create({
    data: {
      userId,
      annee: Number(annee),
      montant: ecart,
      motif: `${motif.trim()} (solde forcé à ${valeurCible} j)`,
      createdById: session.user.id,
    },
  });

  const ajustement = await prisma.leaveBalanceAdjustment.create({
    data: {
      userId,
      annee: Number(annee),
      montant: Number(montant),
      motif: motif.trim(),
      createdById: session.user.id,
    },
  });

  await logAudit(session.user.id, "AJUSTEMENT_SOLDE_CREE", `${userId} — campagne ${annee} — ${montant > 0 ? "+" : ""}${montant}j — ${motif}`);
  await notify(userId, "Ajustement de solde", `Un ajustement de ${montant > 0 ? "+" : ""}${montant} j a été appliqué à votre solde CP (${annee}) : ${motif}`);

  return NextResponse.json(ajustement, { status: 201 });
}

// GET : liste des ajustements (pour affichage admin), filtrable par userId.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const ajustements = await prisma.leaveBalanceAdjustment.findMany({
    where: userId ? { userId } : {},
    include: { user: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ajustements);
}
