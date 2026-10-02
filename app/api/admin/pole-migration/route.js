import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "pole" TEXT
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Migration pôle utilisateurs:", error);
    return NextResponse.json(
      { error: "Impossible d’ajouter le champ pôle." },
      { status: 500 }
    );
  }
}
