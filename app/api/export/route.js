import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAny } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { calculerSoldeCP } from "@/lib/moteurConges";

export const dynamic = "force-dynamic";

// GET : export CSV des soldes pour la paie (§4B). Filtrable par annee.
// Reserve a comptable/employeur/admin.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAny(session.user, ["comptable", "employeur", "admin"])) {
    return NextResponse.json({ error: "Accès réservé." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const annee = Number(searchParams.get("annee")) || new Date().getFullYear();
  const campagneActuelle = new Date().getMonth() >= 5 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const dateReference = annee === campagneActuelle ? new Date() : new Date(annee + 1, 4, 31, 23, 59, 59);

  const [balancesAutres, users] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { annee, leaveType: { code: { not: "CP" } } },
      include: { user: true, leaveType: true },
      orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
    }),
    prisma.user.findMany({ where: { statutCompte: "ACTIF" } }),
  ]);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const soldesCP = await Promise.all(
    users.map(async (u) => ({ user: u, solde: await calculerSoldeCP(prisma, u.id, dateReference) }))
  );

  const header = "Nom;Prenom;Service;Type;Code;Jours acquis;Jours pris;Jours restants\n";

  const lignesCP = soldesCP.flatMap(({ user, solde }) => {
    const lignes = [
      [user.nom, user.prenom, user.service || "", "Congé payé", "CP N", solde.acquis, solde.pris, solde.disponible].join(";"),
    ];
    if (solde.n1.acquis > 0) {
      lignes.push(
        [user.nom, user.prenom, user.service || "", "Congé payé", "CP N-1", solde.n1.acquis, solde.n1.pris, solde.n1.disponible].join(";")
      );
    }
    return lignes;
  });

  const lignesAutres = balancesAutres
    .filter((b) => usersById.has(b.userId))
    .map((b) => {
      const restants = b.leaveType.comptabiliseSolde ? Math.max(0, b.joursAcquis - b.joursPris) : "";
      return [b.user.nom, b.user.prenom, b.user.service || "", b.leaveType.libelle, b.leaveType.code, b.leaveType.comptabiliseSolde ? b.joursAcquis : "", b.joursPris, restants].join(";");
    });

  const csv = header + [...lignesCP, ...lignesAutres].join("\n");

  await logAudit(session.user.id, "EXPORT_PAIE", `année ${annee}`);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cf-reseaux-conges-${annee}.csv"`,
    },
  });
}
