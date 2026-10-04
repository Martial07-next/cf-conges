import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const result = await prisma.notification.updateMany({
    where: { userId: session.user.id, lu: false },
    data: { lu: true },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const result = await prisma.notification.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
