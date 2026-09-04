import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

import { periodeAnnee, joursOuvresEntre } from "@/lib/campagneConges";

const JOURS_PAR_MOIS = 2.5;
const PLAFOND_ANNUEL = 30;

export async function GET(req) {
  try {
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

    const debutMoisCourant = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMoisCourant = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const joursOuvresMois = joursOuvresEntre(debutMoisCourant, finMoisCourant);

    const users = await prisma.user.findMany({
      where: { statutCompte: "ACTIF", dateEntree: { not: null } },
    });

    let count = 0;

    for (const user of users) {
      const dateEntree = new Date(user.dateEntree);

      // Pas encore arrivé ce mois-ci (date d'entrée future) : rien à créditer.
      if (dateEntree > finMoisCourant) continue;

      // Point de départ effectif dans le mois : le 1er du mois, sauf si la
      // personne est arrivée EN COURS de ce mois précis -> proratisation.
      const debutEffectif = dateEntree > debutMoisCourant ? dateEntree : debutMoisCourant;

      const joursOuvresTravailles = joursOuvresEntre(debutEffectif, finMoisCourant);
      if (joursOuvresTravailles <= 0 || joursOuvresMois <= 0) continue;

      // Un mois complet travaillé donne exactement 2.5 jours. Un mois partiel
      // (arrivée en cours de mois) donne la proportion exacte de jours ouvrés
      // réellement travaillés ce mois-là.
      const accroissement = (joursOuvresTravailles / joursOuvresMois) * JOURS_PAR_MOIS;

      const existant = await prisma.leaveBalance.findUnique({
        where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee } },
      });

      const nouveauTotal = Math.min(PLAFOND_ANNUEL, (existant?.joursAcquis || 0) + accroissement);

      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee } },
        update: { joursAcquis: nouveauTotal },
        create: { userId: user.id, leaveTypeId: cp.id, annee, joursAcquis: nouveauTotal, joursPris: 0 },
      });

      count++;
    }

    await prisma.accrualRun.create({ data: { moisAnnee: cleMois, nombreComptes: count } });
    await logAudit(null, "ACQUISITION_CP_MENSUELLE", `${cleMois} — ${count} comptes crédités (proratisé sur jours ouvrés)`);

    return NextResponse.json({ ok: true, moisAnnee: cleMois, periode: annee, comptesCredites: count });
  } catch (error) {
    console.error("Erreur cron acquisition CP :", error);
    return NextResponse.json({ error: "Erreur lors de l'acquisition mensuelle des CP." }, { status: 500 });
  }
}
