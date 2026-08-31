import { prisma } from "./prisma";
import { sendPushToUser } from "./webpush";
import { logAudit } from "./audit";

// Cree une notification in-app + push mobile. Si RESEND_API_KEY est
// configuree ET que la personne a active "recevoir par email", tente aussi
// un envoi email transactionnel. Chaque canal est best-effort : ne bloque
// jamais le flux principal si l'un d'eux echoue, mais logue l'echec.
export async function notify(userId, type, message) {
  const notification = await prisma.notification.create({
    data: { userId, type, message },
  });

  sendPushToUser(userId, type, message).catch((e) => console.error("Push depuis notify() (non bloquant):", e));

  if (process.env.RESEND_API_KEY) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email && user.recevoirEmails) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "CF Réseaux Congés <onboarding@resend.dev>",
            to: user.email,
            subject: "CF Réseaux Congés - " + type,
            text: message,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error("Resend error:", res.status, errBody);
          await logAudit(null, "EMAIL_ECHEC", `${user.email} — HTTP ${res.status} — ${errBody.slice(0, 200)}`);
        }
      }
    } catch (e) {
      console.error("Email send error (non bloquant):", e);
      await logAudit(null, "EMAIL_ECHEC", String(e).slice(0, 200));
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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "CF Réseaux Congés <onboarding@resend.dev>",
        to,
        subject: "CF Réseaux Congés - " + subject,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resend error (notifyAdminEmail):", res.status, errBody);
      await logAudit(null, "EMAIL_ECHEC", `${to} — HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }
  } catch (e) {
    console.error("Email admin send error (non bloquant):", e);
    await logAudit(null, "EMAIL_ECHEC", String(e).slice(0, 200));
  }
}
