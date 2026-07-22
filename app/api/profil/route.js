import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// PATCH : mise a jour du profil personnel (mot de passe, preference de notifications).
// Volontairement separe de /api/users/[id] qui gere les droits d'acces et roles.
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const data = {};

  if (body.recevoirEmails !== undefined) {
    data.recevoirEmails = !!body.recevoirEmails;
  }

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel requis." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const valid = await bcrypt.compare(body.currentPassword, user.motDePasseHash);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }
    data.motDePasseHash = await bcrypt.hash(body.newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id: session.user.id }, data });
  await logAudit(session.user.id, "PROFIL_MODIFIE", session.user.email);

  return NextResponse.json({ ok: true, recevoirEmails: updated.recevoirEmails });
}
