import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const notif = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notif || notif.userId !== session.user.id) {
    return NextResponse.json({ error: "Notification introuvable." }, { status: 404 });
  }

  const updated = await prisma.notification.update({ where: { id: params.id }, data: { lu: true } });
  return NextResponse.json(updated);
}
