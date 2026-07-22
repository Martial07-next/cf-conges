import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET : liste des utilisateurs.
// - employeur/admin/comptable -> tous (comptable en lecture seule cote UI)
// - collaborateur -> version allegee, pour le planning d'equipe (pas d'email/role)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canSeeFull = ["EMPLOYEUR", "ADMIN", "COMPTABLE"].includes(session.user.role);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: canSeeFull,
      role: canSeeFull,
      service: true,
      statutCompte: canSeeFull,
      dateEntree: canSeeFull,
      createdAt: canSeeFull,
    },
    orderBy: { nom: "asc" },
  });

  return NextResponse.json(users);
}
