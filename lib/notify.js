import { prisma } from "./prisma";
import { sendPushToUser } from "./webpush";

// Cree une notification in-app + push mobile. Si RESEND_API_KEY est
// configuree, tente egalement un envoi email transactionnel. Chaque canal est
// best-effort : ne bloque jamais le flux principal si l'un d'eux echoue.
export async function notify(userId, type, message) {
  const notification = await prisma.notification.create({
    data: { userId, type, message },
  });

  sendPushToUser(userId, type, message).catch((e) => console.error("Push depuis notify() (non bloquant):", e));

  if (process.env.RESEND_API_KEY) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "admin@cf-reseaux.fr",
            to: user.email,
            subject: "CF Reseaux Conges - " + type,
            text: message,
          }),
        });
      }
    } catch (e) {
      console.error("Email send error (non bloquant):", e);
    }
  }

  return notification;
}

// Envoie un email direct a une adresse fixe (ex: ton Outlook personnel),
// independamment de tout compte utilisateur de l'app. Best-effort : ne
// bloque jamais le flux principal si l'envoi echoue ou n'est pas configure.
export async function notifyAdminEmail(subject, text) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!process.env.RESEND_API_KEY || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "admin@cf-reseaux.fr",
        to,
        subject: "CF Réseaux Congés - " + subject,
        text,
      }),
    });
  } catch (e) {
    console.error("Email admin send error (non bloquant):", e);
  }
}
