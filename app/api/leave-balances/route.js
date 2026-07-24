import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET : soldes de conges.
// - collaborateur -> les siens uniquement
// - comptable/employeur/admin -> tous (vue paie / pilotage), filtrable par ?userId=
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const where = {};
  if (session.user.role === "COLLABORATEUR") {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  const balances = await prisma.leaveBalance.findMany({
    where,
    include: {
      leaveType: true,
      user: { select: { id: true, nom: true, prenom: true, service: true } },
    },
    orderBy: [{ user: { nom: "asc" } }, { leaveType: { ordre: "asc" } }],
  });

  const withRestants = balances.map((b) => ({
    ...b,
    joursRestants: b.leaveType.comptabiliseSolde ? Math.max(0, b.joursAcquis - b.joursPris) : null,
  }));

  return NextResponse.json(withRestants);
}
