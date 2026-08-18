import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 5 ? y : y - 1;
}

// POST : saisie unique du solde de CP restant, a la premiere connexion.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { joursRestants } = await req.json();
  const restants = Number(joursRestants);
  if (Number.isNaN(restants) || restants < 0) {
    return NextResponse.json({ error: "Merci d'indiquer un nombre de jours valide." }, { status: 400 });
  }

  const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });
  if (!cp) return NextResponse.json({ error: "Type de congé CP introuvable." }, { status: 500 });

  const annee = periodeAnnee(new Date());

  const existant = await prisma.leaveBalance.findUnique({
    where: { userId_leaveTypeId_annee: { userId: session.user.id, leaveTypeId: cp.id, annee } },
  });
  const joursAcquisActuels = existant?.joursAcquis || 0;
  const joursPris = Math.max(0, joursAcquisActuels - restants);

  await prisma.leaveBalance.upsert({
    where: { userId_leaveTypeId_annee: { userId: session.user.id, leaveTypeId: cp.id, annee } },
    update: { joursPris },
    create: { userId: session.user.id, leaveTypeId: cp.id, annee, joursAcquis: joursAcquisActuels, joursPris },
  });

  await prisma.user.update({ where: { id: session.user.id }, data: { soldeInitialSaisi: true } });
  await logAudit(session.user.id, "SOLDE_INITIAL_SAISI", `${restants} j restants déclarés`);

  return NextResponse.json({ ok: true });
}
