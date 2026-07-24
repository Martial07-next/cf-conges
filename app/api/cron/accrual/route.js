import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const JOURS_PAR_MOIS = 2.5; // 2.5 j/mois x 12 mois = 30 j/an

// Determine l'annee de reference de la periode d'acquisition (mai -> avril).
// Ex: en juillet 2026 ou en mars 2027, la periode est "2026" (demarree en mai 2026).
function periodeAnnee(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  return m >= 5 ? y : y - 1;
}

// GET : appelée par Vercel Cron le 1er de chaque mois (voir vercel.json).
// Protégée par CRON_SECRET (Vercel ajoute automatiquement le header
// Authorization: Bearer <CRON_SECRET> si la variable est définie).
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const now = new Date();
  const cleMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const dejaExecute = await prisma.accrualRun.findUnique({ where: { moisAnnee: cleMois } });
  if (dejaExecute) {
    return NextResponse.json({ ok: true, skipped: true, message: `Acquisition déjà effectuée pour ${cleMois}.` });
  }

  const annee = periodeAnnee(now);

  const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });
  if (!cp) {
    return NextResponse.json({ error: "Type de congé CP introuvable." }, { status: 500 });
  }

  const users = await prisma.user.findMany({ where: { statutCompte: "ACTIF" } });

  let count = 0;
  for (const user of users) {
    await prisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee } },
      update: { joursAcquis: { increment: JOURS_PAR_MOIS } },
      create: { userId: user.id, leaveTypeId: cp.id, annee, joursAcquis: JOURS_PAR_MOIS, joursPris: 0 },
    });
    count++;
  }

  await prisma.accrualRun.create({ data: { moisAnnee: cleMois, nombreComptes: count } });
  await logAudit(null, "ACQUISITION_CP_MENSUELLE", `${cleMois} — ${count} comptes crédités de ${JOURS_PAR_MOIS}j (période ${annee})`);

  return NextResponse.json({ ok: true, moisAnnee: cleMois, periode: annee, comptesCredites: count });
}
