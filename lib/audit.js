import { prisma } from "./prisma";

// Journal d'audit (§6 du cahier des charges) : trace qui a fait quoi, quand.
export async function logAudit(userId, action, cible) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId || null, action, cible: cible || null },
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
