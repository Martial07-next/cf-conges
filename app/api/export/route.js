import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET : export CSV des soldes pour la paie (§4B). Filtrable par annee.
// Reserve a comptable/employeur/admin.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["COMPTABLE", "EMPLOYEUR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Accès réservé." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const annee = Number(searchParams.get("annee")) || new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { annee },
    include: { user: true, leaveType: true },
    orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
  });

  const header = "Nom;Prenom;Service;Type;Code;Jours acquis;Jours pris;Jours restants\n";
  const rows = balances.map((b) => {
    const restants = b.leaveType.comptabiliseSolde ? Math.max(0, b.joursAcquis - b.joursPris) : "";
    return [
      b.user.nom,
      b.user.prenom,
      b.user.service || "",
      b.leaveType.libelle,
      b.leaveType.code,
      b.leaveType.comptabiliseSolde ? b.joursAcquis : "",
      b.joursPris,
      restants,
    ].join(";");
  });

  const csv = header + rows.join("\n");

  await logAudit(session.user.id, "EXPORT_PAIE", `année ${annee}`);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cf-reseaux-conges-${annee}.csv"`,
    },
  });
}
