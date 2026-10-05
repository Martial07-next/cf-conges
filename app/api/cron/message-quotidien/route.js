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

  // Le plan Vercel utilisé ici ne doit déclencher ce cron qu'une fois par jour.
  // L'exécution est donc fixée à 07:30 UTC : 08:30 en hiver et 09:30 en été.
  // Le message quotidien reste ainsi fiable toute l'année sans multiplier
  // les exécutions du cron.
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

  const dansFenetreMatin =
    (heure === 8 || heure === 9) &&
    minute >= 25 &&
    minute <= 55;

  if (jour === "sam." || jour === "dim." || !dansFenetreMatin) {
    return NextResponse.json({ ok: true, skipped: true, raison: "Hors fenêtre du message quotidien en semaine." });
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
