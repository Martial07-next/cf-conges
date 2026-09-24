import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calculerSoldeCP } from "@/lib/moteurConges";

export const dynamic = "force-dynamic";

// GET ?userId=...&date=... : renvoie le reliquat N-1 disponible pour ce
// collaborateur a cette date, pour que l'admin decide en connaissance de
// cause s'il veut piocher dessus.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!canAccess(session?.user, "admin")) {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date");
  if (!userId || !date) return NextResponse.json({ disponible: 0 });

  const solde = await calculerSoldeCP(prisma, userId, new Date(date));
  return NextResponse.json({ disponible: solde.n1.disponible });
}
