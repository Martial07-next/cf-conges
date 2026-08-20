import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE : annule une exception (le télétravail redevient actif ce jour-là).
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const exception = await prisma.teletravailException.findUnique({ where: { id: params.id } });
  if (!exception || exception.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  await prisma.teletravailException.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
