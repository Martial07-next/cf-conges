import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { periodeAnnee, joursAcquisDepuisDebutCampagne, arrondi2 } from "@/lib/campagneConges";

export const dynamic = "force-dynamic";

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

    const cp = await prisma.leaveType.findUnique({ where: { code: "CP" } });
    if (!cp) {
      return NextResponse.json({ error: "Type de congé CP introuvable." }, { status: 500 });
    }

    // Le cron tourne le 1er du mois : on credite le mois qui VIENT DE SE
    // TERMINER (retroactif), jamais le mois en cours par avance.
    const finMoisPrecedent = new Date(now.getFullYear(), now.getMonth(), 0);
    const annee = periodeAnnee(finMoisPrecedent);

    const users = await prisma.user.findMany({
      where: { statutCompte: "ACTIF", dateEntree: { not: null } },
    });

    let count = 0;

    for (const user of users) {
      const dateEntree = new Date(user.dateEntree);
      if (dateEntree > finMoisPrecedent) continue; // pas encore arrivé le mois dernier

      // Recalcul complet (pas un simple +2.5) : auto-reparateur, capped a 30,
      // toujours coherent avec la date d'entree quel que soit l'etat actuel.
      const acquisRecalcule = arrondi2(joursAcquisDepuisDebutCampagne(finMoisPrecedent, dateEntree));

      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_annee: { userId: user.id, leaveTypeId: cp.id, annee } },
        update: { joursAcquis: acquisRecalcule },
        create: { userId: user.id, leaveTypeId: cp.id, annee, joursAcquis: acquisRecalcule, joursPris: 0 },
      });

      count++;
    }

    await prisma.accrualRun.create({ data: { moisAnnee: cleMois, nombreComptes: count } });
    await logAudit(null, "ACQUISITION_CP_MENSUELLE", `${cleMois} — ${count} comptes recalculés (mois précédent crédité)`);

    return NextResponse.json({ ok: true, moisAnnee: cleMois, periode: annee, comptesCredites: count });
  } catch (error) {
    console.error("Erreur cron acquisition CP :", error);
    return NextResponse.json({ error: "Erreur lors de l'acquisition mensuelle des CP." }, { status: 500 });
  }
}
