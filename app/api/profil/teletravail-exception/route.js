import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST : marque une plage de dates comme "pas de télétravail" (présence exceptionnelle).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { du, au } = await req.json();
  if (!du || !au) return NextResponse.json({ error: "Dates de début et de fin obligatoires." }, { status: 400 });

  const dates = [];
  let d = new Date(du);
  const fin = new Date(au);
  while (d <= fin) {
    dates.push(new Date(d));
    d = new Date(d);
    d.setDate(d.getDate() + 1);
  }

  await prisma.teletravailException.createMany({
    data: dates.map((date) => ({ userId: session.user.id, date })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, jours: dates.length });
}
