import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// PATCH : activer/refuser un acces (employeur, admin), changer le role ou
// desactiver un compte (admin uniquement).
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  const data = {};

  if (body.statutCompte) {
    if (!["EMPLOYEUR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Action réservée à l'employeur ou à l'administrateur." }, { status: 403 });
    }
    data.statutCompte = body.statutCompte;
  }

  if (body.role) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Seul l'administrateur peut changer un rôle." }, { status: 403 });
    }
    data.role = body.role;
  }

  if (body.service !== undefined) data.service = body.service;
  if (body.managerId !== undefined) data.managerId = body.managerId;

  const updated = await prisma.user.update({ where: { id: params.id }, data });

  await logAudit(
    session.user.id,
    "UTILISATEUR_MODIFIE",
    `${target.email} -> ${JSON.stringify(body)}`
  );

  if (body.statutCompte === "ACTIF" && target.statutCompte === "EN_ATTENTE") {
    await notify(target.id, "Accès activé", "Votre accès à la plateforme CF Réseaux Congés a été validé, vous pouvez vous connecter.");
  }

  return NextResponse.json(updated);
}
