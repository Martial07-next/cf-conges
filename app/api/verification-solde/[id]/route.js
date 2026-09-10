import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "employeur")) {
    return NextResponse.json({ error: "Réservé à l'employeur/admin." }, { status: 403 });
  }

  const { reponseAdmin } = await req.json();
  const demande = await prisma.verificationSolde.update({
    where: { id: params.id },
    data: { statut: "TRAITEE", reponseAdmin: reponseAdmin || null, traiteParId: session.user.id, dateTraitement: new Date() },
  });

  await logAudit(session.user.id, "VERIFICATION_SOLDE_TRAITEE", params.id);
  await notify(demande.userId, "Vérification de solde traitée", reponseAdmin || "Votre demande de vérification de solde a été traitée.");

  return NextResponse.json(demande);
}
