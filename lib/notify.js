import { prisma } from "./prisma";

// Cree une notification in-app. Si RESEND_API_KEY est configuree, tente
// egalement un envoi email transactionnel (best-effort, ne bloque jamais
// le flux principal si l'envoi echoue ou n'est pas configure).
export async function notify(userId, type, message) {
  const notification = await prisma.notification.create({
    data: { userId, type, message },
  });

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
            from: process.env.EMAIL_FROM || "conges@cf-reseaux.fr",
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
