import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:conges@cf-reseaux.fr",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

// Envoie une notification push a tous les appareils abonnes d'un utilisateur.
// Best-effort : ne bloque jamais le flux principal, et nettoie automatiquement
// les abonnements qui ne sont plus valides (appareil desinstalle, etc).
export async function sendPushToUser(userId, title, body, url = "/dashboard") {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url })
        );
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("Push send error (non bloquant):", e.message);
        }
      }
    })
  );
}

// Envoie a tous les employeurs et admins actifs.
export async function sendPushToAdmins(title, body, url = "/employeur") {
  const destinataires = await prisma.user.findMany({
    where: { role: { in: ["EMPLOYEUR", "ADMIN"] }, statutCompte: "ACTIF" },
    select: { id: true },
  });
  await Promise.all(destinataires.map((d) => sendPushToUser(d.id, title, body, url)));
}
