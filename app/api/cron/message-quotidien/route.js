import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webpush";
import { messageDuJour } from "@/lib/messagesQuotidiens";
import { logAudit } from "@/lib/audit";
import { ferieEtTravailleurs } from "@/lib/ferieDuJour";

export const dynamic = "force-dynamic";

// GET : appelee chaque matin par Vercel Cron. Envoie un message sympa et
// different chaque jour, en push uniquement (pas de notification in-app,
// pour ne pas encombrer la page Notifications avec des messages informels).
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const modeTest = new URL(req.url).searchParams.get("test") === "1";

  // Plan Vercel Hobby : un seul déclenchement par jour, à une heure non
  // garantie dans l'heure prévue (07:30 UTC peut tomber entre 07:00 et 07:59).
  // Soit 08h-09h à Paris en hiver, 09h-10h en été. On envoie donc dès qu'on
  // est un jour de semaine entre 08h et 11h à Paris, sans filtrer sur les
  // minutes, et une seule fois par jour grâce au journal d'audit.
  const formatParis = (date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Paris",
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .map((p) => [p.type, p.value])
    );
  const maintenant = formatParis(new Date());
  const jourParis = `${maintenant.year}-${maintenant.month}-${maintenant.day}`;
  const heure = Number(maintenant.hour);
  const weekEnd = maintenant.weekday === "Sat" || maintenant.weekday === "Sun";

  if (!modeTest) {
    if (weekEnd || heure < 8 || heure >= 11) {
      return NextResponse.json({ ok: true, skipped: true, raison: "Hors fenêtre du message quotidien en semaine." });
    }

    const dernierEnvoi = await prisma.auditLog.findFirst({
      where: { action: "MESSAGE_QUOTIDIEN_ENVOYE" },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (dernierEnvoi) {
      const d = formatParis(dernierEnvoi.date);
      if (`${d.year}-${d.month}-${d.day}` === jourParis) {
        return NextResponse.json({ ok: true, skipped: true, raison: "Message quotidien déjà envoyé aujourd'hui." });
      }
    }
  }

  // Jour férié : seules les personnes dont le travail ce jour-là a été validé
  // reçoivent le message. Les autres ne sont pas dérangées pendant leur jour off.
  const { ferie, travailleurs } = await ferieEtTravailleurs(prisma, jourParis);
  if (ferie && travailleurs.size === 0 && !modeTest) {
    return NextResponse.json({ ok: true, skipped: true, raison: `Jour férié (${ferie.libelle}) : personne ne travaille.` });
  }

  // Personne en congé / absence validée toute la journée : pas de « Bonjour ».
  // Même fenêtre que le tableau de bord : [minuit, minuit du lendemain[.
  const debutJour = new Date(`${jourParis}T00:00:00.000Z`);
  const lendemain = new Date(debutJour.getTime() + 86400000);
  const absentsJournee = await prisma.leaveRequest.findMany({
    where: { statut: "VALIDE", demiJournee: false, dateDebut: { lt: lendemain }, dateFin: { gte: debutJour }, leaveType: { code: { not: "TT" } } },
    select: { userId: true },
  });
  const enConge = new Set(absentsJournee.map((a) => a.userId));

  const message = messageDuJour();

  const actifs = await prisma.user.findMany({
    where: { statutCompte: "ACTIF" },
    select: { id: true },
  });
  const destinataires = actifs.filter((u) => !enConge.has(u.id) && (!ferie || travailleurs.has(u.id)));

  await Promise.all(destinataires.map((d) => sendPushToUser(d.id, "Bonjour 👋", message)));

  await logAudit(null, modeTest ? "MESSAGE_QUOTIDIEN_TEST" : "MESSAGE_QUOTIDIEN_ENVOYE", `${destinataires.length} destinataire(s)${ferie ? ` (férié : ${ferie.libelle})` : ""} : "${message}"`);

  return NextResponse.json({ ok: true, test: modeTest, message, destinataires: destinataires.length, ferie: ferie?.libelle || null });
}
