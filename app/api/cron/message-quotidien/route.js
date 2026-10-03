import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webpush";
import { messageDuJour } from "@/lib/messagesQuotidiens";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET : appelee chaque matin par Vercel Cron. Envoie un message sympa et
// different chaque jour, en push uniquement (pas de notification in-app,
// pour ne pas encombrer la page Notifications avec des messages informels).
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // Vercel planifie en UTC. Le cron passe à 06:30 et 07:30 UTC afin
  // de couvrir heure d'été + heure d'hiver ; seule l'exécution correspondant
  // réellement à 08:30 à Paris envoie les notifications.
  const partiesParis = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const valeur = (type) => partiesParis.find((p) => p.type === type)?.value;
  const jour = valeur("weekday");
  const heure = Number(valeur("hour"));
  const minute = Number(valeur("minute"));

  if (jour === "sam." || jour === "dim." || heure !== 8 || minute !== 30) {
    return NextResponse.json({ ok: true, skipped: true, raison: "Hors créneau 08:30 Europe/Paris en semaine." });
  }

  const message = messageDuJour();

  const destinataires = await prisma.user.findMany({
    where: { statutCompte: "ACTIF" },
    select: { id: true },
  });

  await Promise.all(destinataires.map((d) => sendPushToUser(d.id, "Bonjour 👋", message)));

  await logAudit(null, "MESSAGE_QUOTIDIEN_ENVOYE", `${destinataires.length} destinataire(s) — "${message}"`);

  return NextResponse.json({ ok: true, message, destinataires: destinataires.length });
}
