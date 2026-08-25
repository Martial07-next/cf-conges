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

  const message = messageDuJour();

  const destinataires = await prisma.user.findMany({
    where: { statutCompte: "ACTIF" },
    select: { id: true },
  });

  await Promise.all(destinataires.map((d) => sendPushToUser(d.id, "Bonjour 👋", message)));

  await logAudit(null, "MESSAGE_QUOTIDIEN_ENVOYE", `${destinataires.length} destinataire(s) — "${message}"`);

  return NextResponse.json({ ok: true, message, destinataires: destinataires.length });
}
