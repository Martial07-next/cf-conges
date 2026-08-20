import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE : annule un echange (retour au rythme habituel ce jour-la).
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const override = await prisma.teletravailOverride.findUnique({ where: { id: params.id } });
  if (!override || override.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  await prisma.teletravailOverride.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
